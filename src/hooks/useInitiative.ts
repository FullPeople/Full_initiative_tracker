import { useState, useEffect, useCallback, useMemo } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { InitiativeItem, CombatState } from "../types";
import {
  METADATA_KEY,
  COMBAT_STATE_KEY,
  BROADCAST_COMBAT_START,
  BROADCAST_COMBAT_END,
  COMBAT_EFFECT_MODAL_ID,
} from "../utils/constants";
import { itemToInitiativeItem, getCombatState, setCombatState } from "../utils/metadata";

export function useInitiative() {
  const [allItems, setAllItems] = useState<InitiativeItem[]>([]);
  const [combatState, setCombatStateLocal] = useState<CombatState>({
    inCombat: false,
    round: 0,
  });

  // Visible items only — hidden items are excluded from display and turn order
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

    const unsubStart = OBR.broadcast.onMessage(BROADCAST_COMBAT_START, () => {
      OBR.modal.open({
        id: COMBAT_EFFECT_MODAL_ID,
        url: `${import.meta.env.BASE_URL}combat-effect.html`,
        width: 600,
        height: 400,
        fullScreen: true,
        hidePaper: true,
      });
    });

    const unsubEnd = OBR.broadcast.onMessage(BROADCAST_COMBAT_END, () => {
      refreshCombat();
      refreshItems();
    });

    return () => {
      unsubItems();
      unsubMeta();
      unsubStart();
      unsubEnd();
    };
  }, [refreshItems, refreshCombat]);

  // Focus camera on item with moderate zoom
  const focusItem = useCallback(async (itemId: string) => {
    const targetItems = await OBR.scene.items.getItems([itemId]);
    if (targetItems.length === 0) return;

    const pos = targetItems[0].position;
    const vpWidth = await OBR.viewport.getWidth();
    const vpHeight = await OBR.viewport.getHeight();
    const scale = 1;

    await OBR.viewport.animateTo({
      position: {
        x: -pos.x * scale + vpWidth / 2,
        y: -pos.y * scale + vpHeight / 2,
      },
      scale,
    });
  }, []);

  const updateCount = useCallback(async (itemId: string, count: number) => {
    await OBR.scene.items.updateItems([itemId], (drafts) => {
      for (const d of drafts) {
        const existing = d.metadata[METADATA_KEY] as any;
        d.metadata[METADATA_KEY] = { ...existing, count };
      }
    });
  }, []);

  // Batch set active — operates on ALL items (including hidden) to keep state correct
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
    await setActiveItem(firstId);
    await setCombatState({ inCombat: true, round: 1 });
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_START, {});
    await focusItem(firstId);
  }, [items, setActiveItem, focusItem]);

  // Next/prev only navigate among VISIBLE items
  const nextTurn = useCallback(async () => {
    if (items.length === 0) return;
    const currentIndex = items.findIndex((i) => i.active);
    const nextIndex = (currentIndex + 1) % items.length;

    if (nextIndex === 0) {
      await setCombatState({ round: combatState.round + 1 });
    }

    const nextId = items[nextIndex].id;
    await setActiveItem(nextId);
    await focusItem(nextId);
  }, [items, combatState.round, setActiveItem, focusItem]);

  const prevTurn = useCallback(async () => {
    if (items.length === 0) return;
    const currentIndex = items.findIndex((i) => i.active);
    const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;

    if (prevIndex === items.length - 1 && currentIndex === 0 && combatState.round > 1) {
      await setCombatState({ round: combatState.round - 1 });
    }

    const prevId = items[prevIndex].id;
    await setActiveItem(prevId);
    await focusItem(prevId);
  }, [items, combatState.round, setActiveItem, focusItem]);

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
  }, [allItems]);

  return {
    items,
    combatState,
    focusItem,
    updateCount,
    startCombat,
    nextTurn,
    prevTurn,
    endCombat,
  };
}
