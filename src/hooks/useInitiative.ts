import { useState, useEffect, useCallback, useMemo } from "preact/compat";
import OBR from "@owlbear-rodeo/sdk";
import { InitiativeItem, CombatState } from "../types";
import {
  METADATA_KEY,
  COMBAT_STATE_KEY,
  BROADCAST_COMBAT_START,
  BROADCAST_COMBAT_END,
  BROADCAST_FOCUS,
  BROADCAST_OPEN_PANEL,
  BROADCAST_CLOSE_PANEL,
  COMBAT_EFFECT_MODAL_ID,
} from "../utils/constants";
import { itemToInitiativeItem, getCombatState, setCombatState } from "../utils/metadata";
import { getStoredLang } from "../utils/i18n";

export function useInitiative() {
  const [allItems, setAllItems] = useState<InitiativeItem[]>([]);
  const [combatState, setCombatStateLocal] = useState<CombatState>({
    inCombat: false,
    round: 0,
  });

  const items = useMemo(
    () => allItems.filter((i) => i.visible),
    [allItems]
  );

  const refreshItems = useCallback(async () => {
    const sceneItems = await OBR.scene.items.getItems(
      (item) => item.metadata[METADATA_KEY] !== undefined
    );
    const mapped = sceneItems
      .map(itemToInitiativeItem)
      .filter((x): x is InitiativeItem => x !== null)
      .sort((a, b) => b.count - a.count);
    setAllItems(mapped);
  }, []);

  const refreshCombat = useCallback(async () => {
    const state = await getCombatState();
    setCombatStateLocal(state);
  }, []);

  useEffect(() => {
    refreshItems();
    refreshCombat();

    const unsubItems = OBR.scene.items.onChange(() => refreshItems());
    const unsubMeta = OBR.scene.onMetadataChange(() => refreshCombat());

    // Combat start: show effect + open panel
    const unsubStart = OBR.broadcast.onMessage(
      BROADCAST_COMBAT_START,
      (event) => {
        const lang = (event.data as any)?.lang || "en";
        OBR.modal.open({
          id: COMBAT_EFFECT_MODAL_ID,
          url: `${import.meta.env.BASE_URL}combat-effect.html?lang=${lang}`,
          width: 600,
          height: 400,
          fullScreen: true,
          hidePaper: true,
        });
      }
    );

    // Combat end
    const unsubEnd = OBR.broadcast.onMessage(BROADCAST_COMBAT_END, () => {
      refreshCombat();
      refreshItems();
    });

    // Focus broadcast: all players focus camera — parallel queries
    const unsubFocus = OBR.broadcast.onMessage(
      BROADCAST_FOCUS,
      async (event) => {
        const itemId = (event.data as any)?.itemId;
        if (!itemId) return;

        const [targetItems, vpWidth, vpHeight, currentScale] = await Promise.all([
          OBR.scene.items.getItems([itemId]),
          OBR.viewport.getWidth(),
          OBR.viewport.getHeight(),
          OBR.viewport.getScale(),
        ]);
        if (targetItems.length === 0) return;

        const pos = targetItems[0].position;
        OBR.viewport.animateTo({
          position: {
            x: -pos.x * currentScale + vpWidth / 2,
            y: -pos.y * currentScale + vpHeight / 2,
          },
          scale: currentScale,
        });
      }
    );

    // Auto open panel
    const unsubOpenPanel = OBR.broadcast.onMessage(BROADCAST_OPEN_PANEL, () => {
      OBR.action.open();
    });

    // Auto close panel
    const unsubClosePanel = OBR.broadcast.onMessage(BROADCAST_CLOSE_PANEL, () => {
      OBR.action.close();
    });

    return () => {
      unsubItems();
      unsubMeta();
      unsubStart();
      unsubEnd();
      unsubFocus();
      unsubOpenPanel();
      unsubClosePanel();
    };
  }, [refreshItems, refreshCombat]);

  // Focus camera locally — all queries in parallel for speed
  const focusItem = useCallback(async (itemId: string) => {
    const [targetItems, vpWidth, vpHeight, currentScale] = await Promise.all([
      OBR.scene.items.getItems([itemId]),
      OBR.viewport.getWidth(),
      OBR.viewport.getHeight(),
      OBR.viewport.getScale(),
    ]);
    if (targetItems.length === 0) return;

    const pos = targetItems[0].position;
    OBR.viewport.animateTo({
      position: {
        x: -pos.x * currentScale + vpWidth / 2,
        y: -pos.y * currentScale + vpHeight / 2,
      },
      scale: currentScale,
    });
  }, []);

  // Broadcast focus to ALL players — fire-and-forget, don't await
  const broadcastFocus = useCallback(async (itemId: string) => {
    OBR.broadcast.sendMessage(BROADCAST_FOCUS, { itemId });
    focusItem(itemId);
  }, [focusItem]);

  const updateCount = useCallback(async (itemId: string, count: number) => {
    await OBR.scene.items.updateItems([itemId], (drafts) => {
      for (const d of drafts) {
        const existing = d.metadata[METADATA_KEY] as any;
        d.metadata[METADATA_KEY] = { ...existing, count };
      }
    });
  }, []);

  const updateModifier = useCallback(async (itemId: string, mod: number) => {
    await OBR.scene.items.updateItems([itemId], (drafts) => {
      for (const d of drafts) {
        d.metadata["com.initiative-tracker/dexMod"] = mod;
      }
    });
  }, []);

  const rollInitiative = useCallback(async (itemId: string) => {
    // Find the item's modifier
    const item = allItems.find((i) => i.id === itemId);
    const mod = item?.modifier ?? 0;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod;
    await OBR.scene.items.updateItems([itemId], (drafts) => {
      for (const d of drafts) {
        const existing = d.metadata[METADATA_KEY] as any;
        d.metadata[METADATA_KEY] = { ...existing, count: total };
      }
    });
    OBR.notification.show(`🎲 ${item?.name ?? ""}: ${roll}${mod >= 0 ? "+" : ""}${mod} = ${total}`);
  }, [allItems]);

  const setActiveItem = useCallback(
    async (activeId: string) => {
      const allIds = allItems.map((i) => i.id);
      if (allIds.length === 0) return;

      await OBR.scene.items.updateItems(allIds, (drafts) => {
        for (const d of drafts) {
          const existing = d.metadata[METADATA_KEY] as any;
          if (existing) {
            d.metadata[METADATA_KEY] = {
              ...existing,
              active: d.id === activeId,
            };
          }
        }
      });
    },
    [allItems]
  );

  const startCombat = useCallback(async () => {
    if (items.length === 0) return;

    const firstId = items[0].id;
    const lang = getStoredLang();
    await setActiveItem(firstId);
    await setCombatState({ inCombat: true, round: 1 });
    // Broadcast combat start with lang, open panels, and focus
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_START, { lang });
    await OBR.broadcast.sendMessage(BROADCAST_OPEN_PANEL, {});
    await broadcastFocus(firstId);
  }, [items, setActiveItem, broadcastFocus]);

  const nextTurn = useCallback(async () => {
    if (items.length === 0) return;
    const currentIndex = items.findIndex((i) => i.active);
    const nextIndex = (currentIndex + 1) % items.length;

    if (nextIndex === 0) {
      await setCombatState({ round: combatState.round + 1 });
    }

    const nextId = items[nextIndex].id;
    await setActiveItem(nextId);
    await broadcastFocus(nextId);
  }, [items, combatState.round, setActiveItem, broadcastFocus]);

  const prevTurn = useCallback(async () => {
    if (items.length === 0) return;
    const currentIndex = items.findIndex((i) => i.active);
    const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;

    if (prevIndex === items.length - 1 && currentIndex === 0 && combatState.round > 1) {
      await setCombatState({ round: combatState.round - 1 });
    }

    const prevId = items[prevIndex].id;
    await setActiveItem(prevId);
    await broadcastFocus(prevId);
  }, [items, combatState.round, setActiveItem, broadcastFocus]);

  const endCombat = useCallback(async () => {
    const allIds = allItems.map((i) => i.id);
    if (allIds.length > 0) {
      await OBR.scene.items.updateItems(allIds, (drafts) => {
        for (const d of drafts) {
          const existing = d.metadata[METADATA_KEY] as any;
          if (existing) {
            d.metadata[METADATA_KEY] = { ...existing, active: false };
          }
        }
      });
    }
    await setCombatState({ inCombat: false, round: 0 });
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_END, {});
    await OBR.broadcast.sendMessage(BROADCAST_CLOSE_PANEL, {});
  }, [allItems]);

  return {
    items,
    combatState,
    focusItem,
    updateCount,
    updateModifier,
    rollInitiative,
    startCombat,
    nextTurn,
    prevTurn,
    endCombat,
  };
}
