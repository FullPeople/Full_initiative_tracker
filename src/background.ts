import OBR from "@owlbear-rodeo/sdk";
import {
  METADATA_KEY,
  OPTED_OUT_KEY,
  COMBAT_STATE_KEY,
  BROADCAST_OPEN_PANEL,
  BROADCAST_CLOSE_PANEL,
  NEW_ITEM_DIALOG_ID,
} from "./utils/constants";
import { getStoredLang, t } from "./utils/i18n";

const POPOVER_ID = "com.initiative-tracker/panel";
const BASE = import.meta.env.BASE_URL;
const PANEL_URL = `${location.origin}${BASE}panel.html`;
const ICON_URL = `${BASE}icon.svg`;

// Horizontal strip at top-center. Stays just below OBR's top toolbar.
// Bestiary monster-info popover (also top-center) opens on-demand and sits
// visually on top of this one thanks to OBR's popover stacking order.
const COLLAPSED_WIDTH = 120;
const COLLAPSED_HEIGHT = 40;
const EXPANDED_WIDTH = 720;
const EXPANDED_HEIGHT = 162;
const TOP_OFFSET = 40;

async function openPanel(expanded: boolean) {
  const width = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
  const height = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
  try {
    const vw = await OBR.viewport.getWidth();
    await OBR.popover.open({
      id: POPOVER_ID,
      url: `${PANEL_URL}?expanded=${expanded ? 1 : 0}`,
      width,
      height,
      anchorReference: "POSITION",
      // Horizontally centered, anchored from top so size changes grow
      // downward (active item bulge won't push the anchor around).
      anchorPosition: { left: Math.round(vw / 2), top: TOP_OFFSET },
      anchorOrigin: { horizontal: "CENTER", vertical: "TOP" },
      transformOrigin: { horizontal: "CENTER", vertical: "TOP" },
      disableClickAway: true,
      hidePaper: true,
    });
  } catch (e) {
    console.error("[initiative] openPanel failed", e);
  }
}

async function closePanel() {
  try { await OBR.popover.close(POPOVER_ID); } catch {}
}

OBR.onReady(async () => {
  const lang = getStoredLang();

  OBR.contextMenu.create({
    id: `${METADATA_KEY}/context-menu`,
    icons: [
      {
        icon: ICON_URL,
        label: t(lang, "addToInitiative"),
        filter: {
          every: [
            { key: "type", value: "IMAGE" },
            { key: ["metadata", METADATA_KEY], value: undefined },
          ],
        },
      },
      {
        icon: ICON_URL,
        label: t(lang, "removeFromInitiative"),
        filter: {
          every: [{ key: "type", value: "IMAGE" }],
          some: [{ key: ["metadata", METADATA_KEY], value: undefined, operator: "!=" }],
        },
      },
    ],
    onClick: async (context) => {
      const anyHasData = context.items.some(
        (item) => item.metadata[METADATA_KEY] !== undefined
      );
      const ids = context.items.map((i) => i.id);
      if (anyHasData) {
        await OBR.scene.items.updateItems(ids, (drafts) => {
          for (const d of drafts) {
            delete d.metadata[METADATA_KEY];
            // Mark as explicitly opted out so we don't re-prompt on reload.
            d.metadata[OPTED_OUT_KEY] = true;
          }
        });
        OBR.notification.show(t(lang, "removed"));
      } else {
        await OBR.scene.items.updateItems(ids, (drafts) => {
          for (const d of drafts) {
            d.metadata[METADATA_KEY] = {
              count: 0,
              active: false,
              rolled: false,
              tiebreak: Math.random(),
              // Owner = whoever OBR says owns the item (character assignee).
              // Falls back to creator when not explicitly assigned. Players
              // with delegated ownership can then roll for their characters.
              ownerId: d.createdUserId,
            };
            // Re-adding clears any prior opt-out.
            delete d.metadata[OPTED_OUT_KEY];
          }
        });
        OBR.notification.show(t(lang, "added"));
      }
    },
  });

  const gatherHandler = async (context: any) => {
    const center = context.selectionBounds.center;
    const items = await OBR.scene.items.getItems(
      (item: any) => item.metadata[METADATA_KEY] !== undefined && item.visible
    );
    if (items.length === 0) return;

    let dpi = 150;
    try { dpi = await OBR.scene.grid.getDpi(); } catch {}
    const spacing = dpi;

    const positions: { x: number; y: number }[] = [{ x: center.x, y: center.y }];
    let ring = 1;
    while (positions.length < items.length) {
      const count = ring * 6;
      for (let i = 0; i < count && positions.length < items.length; i++) {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        positions.push({
          x: center.x + Math.cos(angle) * spacing * ring,
          y: center.y + Math.sin(angle) * spacing * ring,
        });
      }
      ring++;
    }

    const ids = items.map((i) => i.id);
    await OBR.scene.items.updateItems(ids, (drafts) => {
      drafts.forEach((d, idx) => {
        if (positions[idx]) d.position = positions[idx];
      });
    });
    OBR.notification.show(t(lang, "gathered"));
  };

  // Gather only shows on right-click empty space (not on characters).
  OBR.contextMenu.create({
    id: `${METADATA_KEY}/gather-empty`,
    icons: [{
      icon: ICON_URL,
      label: t(lang, "gatherHere"),
      filter: { roles: ["GM"], min: 0, max: 0 },
    }],
    onClick: gatherHandler,
  });

  const openIfScene = async () => {
    try {
      const ready = await OBR.scene.isReady();
      if (ready) await openPanel(false);
    } catch {}
  };
  await openIfScene();
  OBR.scene.onReadyChange(async (ready) => {
    if (ready) await openPanel(false);
    else await closePanel();
  });

  OBR.broadcast.onMessage(BROADCAST_OPEN_PANEL, async () => {
    await openPanel(true);
  });
  OBR.broadcast.onMessage(BROADCAST_CLOSE_PANEL, async () => {
    await openPanel(false);
  });

  const knownItemIds = new Set<string>();
  const initKnown = async () => {
    try {
      if (!(await OBR.scene.isReady())) return;
      const all = await OBR.scene.items.getItems(
        (item) => item.type === "IMAGE" &&
          (item.layer === "CHARACTER" || item.layer === "MOUNT")
      );
      knownItemIds.clear();
      all.forEach((i) => knownItemIds.add(i.id));
    } catch (e) {
      console.error("[initiative] initKnown failed", e);
    }
  };

  let role: "GM" | "PLAYER" = "PLAYER";
  try { role = await OBR.player.getRole(); } catch {}
  if (role === "GM") {
    await initKnown();
    OBR.scene.onReadyChange(async (ready) => {
      if (ready) await initKnown();
    });
    OBR.scene.items.onChange(async (sceneItems) => {
      const meta = await OBR.scene.getMetadata();
      const combat = meta[COMBAT_STATE_KEY] as any;
      const active = !!combat?.inCombat || !!combat?.preparing;

      const characterItems = sceneItems.filter(
        (i) => i.type === "IMAGE" &&
          (i.layer === "CHARACTER" || i.layer === "MOUNT")
      );

      if (!active) {
        knownItemIds.clear();
        characterItems.forEach((i) => knownItemIds.add(i.id));
        return;
      }

      for (const item of characterItems) {
        if (
          !knownItemIds.has(item.id) &&
          !item.metadata[METADATA_KEY] &&
          !item.metadata[OPTED_OUT_KEY]
        ) {
          knownItemIds.add(item.id);
          const curLang = getStoredLang();
          OBR.modal.open({
            id: NEW_ITEM_DIALOG_ID,
            url: `${BASE}new-item-dialog.html?itemId=${item.id}&itemName=${encodeURIComponent(item.name)}&lang=${curLang}`,
            width: 300,
            height: 200,
          });
        }
      }
      knownItemIds.clear();
      characterItems.forEach((i) => knownItemIds.add(i.id));
    });
  }
});
