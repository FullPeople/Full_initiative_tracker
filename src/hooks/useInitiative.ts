import { useState, useEffect, useCallback, useMemo, useRef } from "preact/compat";
import OBR from "@owlbear-rodeo/sdk";
import { InitiativeItem, CombatState } from "../types";
import {
  METADATA_KEY,
  COMBAT_STATE_KEY,
  BROADCAST_COMBAT_START,
  BROADCAST_COMBAT_END,
  BROADCAST_COMBAT_PREPARE,
  BROADCAST_FOCUS,
  BROADCAST_OPEN_PANEL,
  BROADCAST_CLOSE_PANEL,
  COMBAT_EFFECT_MODAL_ID,
  PLUGIN_ID,
  DICE_PLUS_ROLL_REQUEST,
  DICE_PLUS_ROLL_RESULT,
  DICE_PLUS_ROLL_ERROR,
} from "../utils/constants";
import { itemToInitiativeItem, getCombatState, setCombatState } from "../utils/metadata";
import { getStoredLang } from "../utils/i18n";

export type RollType = "disadvantage" | "normal" | "advantage";

function diceNotation(mod: number, type: RollType): string {
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  switch (type) {
    case "disadvantage": return `2d20kl1${modStr}`;
    case "advantage": return `2d20kh1${modStr}`;
    default: return `1d20${modStr}`;
  }
}

function localRoll(mod: number, type: RollType): { roll: number; total: number } {
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;
  let roll: number;
  switch (type) {
    case "disadvantage": roll = Math.min(r1, r2); break;
    case "advantage": roll = Math.max(r1, r2); break;
    default: roll = r1;
  }
  return { roll, total: roll + mod };
}

export function useInitiative() {
  const [allItems, setAllItems] = useState<InitiativeItem[]>([]);
  const [combatState, setCombatStateLocal] = useState<CombatState>({
    inCombat: false,
    preparing: false,
    round: 0,
  });

  const items = useMemo(
    () => allItems.filter((i) => i.visible),
    [allItems]
  );

  // Auto-activate tracking
  const prevActiveId = useRef<string | null>(null);
  const prevItemIds = useRef<string[]>([]);
  const autoActivatePending = useRef(false);

  const refreshItems = useCallback(async () => {
    const sceneItems = await OBR.scene.items.getItems(
      (item) => item.metadata[METADATA_KEY] !== undefined
    );
    const mapped = sceneItems
      .map(itemToInitiativeItem)
      .filter((x): x is InitiativeItem => x !== null)
      .sort((a, b) => (b.count + b.modifier) - (a.count + a.modifier));

    setAllItems(mapped);

    const visible = mapped.filter((i) => i.visible);
    const activeItem = visible.find((i) => i.active);

    // Update prevActiveId for auto-activate tracking
    if (activeItem) {
      prevActiveId.current = activeItem.id;
    }
    prevItemIds.current = visible.map((i) => i.id);
  }, []);

  const refreshCombat = useCallback(async () => {
    const state = await getCombatState();
    setCombatStateLocal(state);
  }, []);

  // Auto-activate: separate effect that watches for active item removal
  useEffect(() => {
    if (!combatState.inCombat) return;

    const prev = prevActiveId.current;
    if (!prev) return;

    const visible = allItems.filter((i) => i.visible);
    const stillExists = visible.some((i) => i.id === prev);

    if (!stillExists && visible.length > 0 && !autoActivatePending.current) {
      autoActivatePending.current = true;

      // Find the best next item: same index position or clamp to last
      const prevIds = prevItemIds.current;
      const prevIndex = prevIds.indexOf(prev);
      const targetIndex = Math.min(
        prevIndex >= 0 ? prevIndex : 0,
        visible.length - 1
      );
      const nextId = visible[targetIndex].id;

      // Schedule outside this render to avoid cascading onChange
      setTimeout(async () => {
        try {
          const allIds = visible.map((i) => i.id);
          await OBR.scene.items.updateItems(allIds, (drafts) => {
            for (const d of drafts) {
              const ex = d.metadata[METADATA_KEY] as any;
              if (ex) d.metadata[METADATA_KEY] = { ...ex, active: d.id === nextId };
            }
          });
          prevActiveId.current = nextId;
        } catch {} finally {
          autoActivatePending.current = false;
        }
      }, 50);
    }
  }, [allItems, combatState.inCombat]);

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
          url: `${import.meta.env.BASE_URL}combat-effect.html?lang=${lang}&type=combat`,
          width: 600,
          height: 400,
          fullScreen: true,
          hidePaper: true,
        });
      }
    );

    // Combat preparation: show yellow effect + open panel
    const unsubPrepare = OBR.broadcast.onMessage(
      BROADCAST_COMBAT_PREPARE,
      (event) => {
        const lang = (event.data as any)?.lang || "en";
        OBR.modal.open({
          id: COMBAT_EFFECT_MODAL_ID,
          url: `${import.meta.env.BASE_URL}combat-effect.html?lang=${lang}&type=prepare`,
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

    // Dice+ roll result listener
    const unsubDiceResult = OBR.broadcast.onMessage(
      DICE_PLUS_ROLL_RESULT,
      async (event) => {
        const data = event.data as any;
        if (!data?.rollId) return;

        // rollId format: "init-{itemId}"
        const itemId = data.rollId.replace("init-", "");
        const totalValue = data.result?.totalValue;
        if (typeof totalValue !== "number") return;

        await OBR.scene.items.updateItems([itemId], (drafts) => {
          for (const d of drafts) {
            const existing = d.metadata[METADATA_KEY] as any;
            if (existing) {
              d.metadata[METADATA_KEY] = { ...existing, count: totalValue, rolled: true };
            }
          }
        });
      }
    );

    // Dice+ roll error: fallback to local roll
    const unsubDiceError = OBR.broadcast.onMessage(
      DICE_PLUS_ROLL_ERROR,
      async (event) => {
        const data = event.data as any;
        if (!data?.rollId) return;

        const itemId = data.rollId.replace("init-", "");
        // Error means Dice+ not available — notification only, item keeps current value
        OBR.notification.show(`Dice+ error: ${data.error || "unknown"}`);
      }
    );

    return () => {
      unsubItems();
      unsubMeta();
      unsubStart();
      unsubPrepare();
      unsubEnd();
      unsubFocus();
      unsubOpenPanel();
      unsubClosePanel();
      unsubDiceResult();
      unsubDiceError();
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

  // Roll initiative locally (for GM, or fallback)
  const rollInitiativeLocal = useCallback(async (itemId: string, type: RollType) => {
    const item = allItems.find((i) => i.id === itemId);
    const mod = item?.modifier ?? 0;
    const { roll, total } = localRoll(mod, type);
    await OBR.scene.items.updateItems([itemId], (drafts) => {
      for (const d of drafts) {
        const existing = d.metadata[METADATA_KEY] as any;
        d.metadata[METADATA_KEY] = { ...existing, count: total };
      }
    });
    const typeLabel = type === "disadvantage" ? " (劣势)" : type === "advantage" ? " (优势)" : "";
    OBR.notification.show(`🎲 ${item?.name ?? ""}: ${roll}${mod >= 0 ? "+" : ""}${mod} = ${total}${typeLabel}`);
  }, [allItems]);

  // Roll via Dice+ (for players during preparation)
  const rollInitiativeDicePlus = useCallback(async (itemId: string, type: RollType) => {
    const item = allItems.find((i) => i.id === itemId);
    const mod = item?.modifier ?? 0;
    const notation = diceNotation(mod, type);

    const [playerId, playerName] = await Promise.all([
      OBR.player.getId(),
      OBR.player.getName(),
    ]);

    await OBR.broadcast.sendMessage(DICE_PLUS_ROLL_REQUEST, {
      rollId: `init-${itemId}`,
      playerId,
      playerName,
      diceNotation: notation,
      rollTarget: "everyone",
      source: PLUGIN_ID,
      showResults: true,
      timestamp: Date.now(),
    });
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

  // Start preparation phase
  const startPreparation = useCallback(async () => {
    if (items.length === 0) return;
    const lang = getStoredLang();

    // Reset all rolled flags
    const allIds = allItems.map((i) => i.id);
    if (allIds.length > 0) {
      await OBR.scene.items.updateItems(allIds, (drafts) => {
        for (const d of drafts) {
          const existing = d.metadata[METADATA_KEY] as any;
          if (existing) {
            d.metadata[METADATA_KEY] = { ...existing, rolled: false, active: false };
          }
        }
      });
    }

    await setCombatState({ preparing: true, inCombat: false, round: 0 });
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_PREPARE, { lang });
    await OBR.broadcast.sendMessage(BROADCAST_OPEN_PANEL, {});
  }, [items, allItems]);

  // Start combat (from preparation)
  const startCombat = useCallback(async () => {
    if (items.length === 0) return;

    const firstId = items[0].id;
    const lang = getStoredLang();

    // Clear rolled flags and activate first
    const allIds = allItems.map((i) => i.id);
    await OBR.scene.items.updateItems(allIds, (drafts) => {
      for (const d of drafts) {
        const existing = d.metadata[METADATA_KEY] as any;
        if (existing) {
          d.metadata[METADATA_KEY] = {
            ...existing,
            rolled: false,
            active: d.id === firstId,
          };
        }
      }
    });

    await setCombatState({ preparing: false, inCombat: true, round: 1 });
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_START, { lang });
    await OBR.broadcast.sendMessage(BROADCAST_OPEN_PANEL, {});
    await broadcastFocus(firstId);
  }, [items, allItems, broadcastFocus]);

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
            d.metadata[METADATA_KEY] = { ...existing, active: false, rolled: false };
          }
        }
      });
    }
    await setCombatState({ inCombat: false, preparing: false, round: 0 });
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_END, {});
    await OBR.broadcast.sendMessage(BROADCAST_CLOSE_PANEL, {});
  }, [allItems]);

  return {
    items,
    combatState,
    focusItem,
    updateCount,
    updateModifier,
    rollInitiativeLocal,
    rollInitiativeDicePlus,
    startPreparation,
    startCombat,
    nextTurn,
    prevTurn,
    endCombat,
  };
}
