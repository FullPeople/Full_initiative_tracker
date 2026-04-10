import OBR, { Item } from "@owlbear-rodeo/sdk";
import {
  METADATA_KEY,
  COMBAT_STATE_KEY,
  NEW_ITEM_DIALOG_ID,
} from "./utils/constants";

OBR.onReady(async () => {
  // Register context menu for adding/removing from initiative
  OBR.contextMenu.create({
    id: `${METADATA_KEY}/context-menu`,
    icons: [
      {
        icon: `${import.meta.env.BASE_URL}icon.svg`,
        label: "Add to Initiative",
        filter: {
          every: [
            { key: "type", value: "IMAGE" },
            { key: ["metadata", METADATA_KEY], value: undefined },
          ],
          roles: ["GM", "PLAYER"],
        },
      },
      {
        icon: `${import.meta.env.BASE_URL}icon.svg`,
        label: "Remove from Initiative",
        filter: {
          every: [{ key: "type", value: "IMAGE" }],
          roles: ["GM", "PLAYER"],
        },
      },
    ],
    onClick: async (context) => {
      const item = context.items[0];
      const hasData = item.metadata[METADATA_KEY] !== undefined;

      if (hasData) {
        // Remove from initiative
        await OBR.scene.items.updateItems(
          context.items.map((i) => i.id),
          (items) => {
            for (const i of items) {
              delete i.metadata[METADATA_KEY];
            }
          }
        );
        OBR.notification.show("Removed from initiative");
      } else {
        // Add to initiative with count 0
        await OBR.scene.items.updateItems(
          context.items.map((i) => i.id),
          (items) => {
            for (const i of items) {
              i.metadata[METADATA_KEY] = { count: 0, active: false };
            }
          }
        );
        OBR.notification.show("Added to initiative");
      }
    },
  });

  // Track existing items to detect new ones during combat
  let knownItemIds = new Set<string>();

  const initializeKnownItems = async () => {
    const allItems = await OBR.scene.items.getItems(
      (item) => item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT")
    );
    knownItemIds = new Set(allItems.map((i) => i.id));
  };

  await initializeKnownItems();

  // Listen for scene ready changes to re-initialize
  OBR.scene.onReadyChange(async (ready) => {
    if (ready) {
      await initializeKnownItems();
    }
  });

  // Monitor for new items during combat (GM only)
  OBR.scene.items.onChange(async (items) => {
    const role = await OBR.player.getRole();
    if (role !== "GM") return;

    const metadata = await OBR.scene.getMetadata();
    const combatState = metadata[COMBAT_STATE_KEY] as
      | { inCombat: boolean }
      | undefined;
    if (!combatState?.inCombat) {
      // Update known items when not in combat
      const characterItems = items.filter(
        (i) => i.type === "IMAGE" && (i.layer === "CHARACTER" || i.layer === "MOUNT")
      );
      knownItemIds = new Set(characterItems.map((i) => i.id));
      return;
    }

    // In combat: check for new CHARACTER/MOUNT items
    const characterItems = items.filter(
      (i) => i.type === "IMAGE" && (i.layer === "CHARACTER" || i.layer === "MOUNT")
    );

    for (const item of characterItems) {
      if (!knownItemIds.has(item.id) && !item.metadata[METADATA_KEY]) {
        knownItemIds.add(item.id);
        // Open dialog to input initiative for new item
        OBR.modal.open({
          id: NEW_ITEM_DIALOG_ID,
          url: `${import.meta.env.BASE_URL}new-item-dialog.html?itemId=${item.id}&itemName=${encodeURIComponent(item.name)}`,
          width: 320,
          height: 180,
        });
      }
    }

    // Update known items
    knownItemIds = new Set(characterItems.map((i) => i.id));
  });
});
