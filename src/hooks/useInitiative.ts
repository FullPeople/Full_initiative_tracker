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
export type EffectType = "prepare" | "ambush" | "combat";

function diceNotation(type: RollType): string {
  switch (type) {
    case "disadvantage": return "2d20kl1";
    case "advantage": return "2d20kh1";
    default: return "1d20";
  }
}

function localRoll(type: RollType): number {
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;
  switch (type) {
    case "disadvantage": return Math.min(r1, r2);
    case "advantage": return Math.max(r1, r2);
    default: return r1;
  }
}

let rollCounter = 0;

export function useInitiative() {
  const [allItems, setAllItems] = useState<InitiativeItem[]>([]);
  const [combatState, setCombatStateLocal] = useState<CombatState>({
    inCombat: false,
    preparing: false,
    round: 0,
  });
  const [diceRolling, setDiceRolling] = useState(false);

  const items = useMemo(
    () => allItems.filter((i) => i.visible),
    [allItems]
  );

  // Auto-activate tracking — all in refs to avoid stale closures
  const prevActiveId = useRef<string | null>(null);
  const prevVisibleIds = useRef<string[]>([]);
  const autoActivateLocked = useRef(false);

  const refreshItems = useCallback(async () => {
    const sceneItems = await OBR.scene.items.getItems(
      (item) => item.metadata[METADATA_KEY] !== undefined
    );
    const mapped = sceneItems
      .map(itemToInitiativeItem)
      .filter((x): x is InitiativeItem => x !== null)
      .sort((a, b) => (b.count + b.modifier) - (a.count + a.modifier));

    const visible = mapped.filter((i) => i.visible);
    const activeItem = visible.find((i) => i.active);

    // --- Auto-activate logic (inside refreshItems, no separate effect) ---
    // Only run during combat, only if not already handling one
    if (!autoActivateLocked.current) {
      // Read combat state directly from OBR to avoid stale React state
      let inCombat = false;
      try {
        const meta = await OBR.scene.getMetadata();
        inCombat = !!(meta[COMBAT_STATE_KEY] as any)?.inCombat;
      } catch {}

      if (inCombat && visible.length > 0 && !activeItem) {
        // No active item in combat — need to auto-activate
        const prev = prevActiveId.current;
        if (prev) {
          autoActivateLocked.current = true;

          // Find best target: same index position as removed item, clamped
          const oldIds = prevVisibleIds.current;
          const prevIdx = oldIds.indexOf(prev);
          const targetIdx = Math.min(
            prevIdx >= 0 ? prevIdx : 0,
            visible.length - 1
          );
          const nextId = visible[targetIdx].id;

          // Use IDs from THIS refresh (fresh, not stale)
          const visibleIds = visible.map((i) => i.id);
          try {
            await OBR.scene.items.updateItems(visibleIds, (drafts) => {
              for (const d of drafts) {
                const ex = d.metadata[METADATA_KEY] as any;
                if (ex) {
                  d.metadata[METADATA_KEY] = { ...ex, active: d.id === nextId };
                }
              }
            });
            prevActiveId.current = nextId;
          } catch {
            // Items may have changed between getItems and updateItems — ignore
          }

          // Keep locked briefly so the onChange from our update doesn't re-trigger
          setTimeout(() => { autoActivateLocked.current = false; }, 300);
          // Don't update state or refs yet — next onChange will do a clean refresh
          return;
        }
      }
    }

    // Normal path: update state and refs
    if (activeItem) {
      prevActiveId.current = activeItem.id;
    }
    prevVisibleIds.current = visible.map((i) => i.id);
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
          url: `${import.meta.env.BASE_URL}combat-effect.html?lang=${lang}&type=combat`,
          width: 600,
          height: 400,
          fullScreen: true,
          hidePaper: true,
        });
      }
    );

    // Combat preparation: show effect + open panel
    const unsubPrepare = OBR.broadcast.onMessage(
      BROADCAST_COMBAT_PREPARE,
      (event) => {
        const data = event.data as any;
        const lang = data?.lang || "en";
        const effectType = data?.effectType || "prepare";
        OBR.modal.open({
          id: COMBAT_EFFECT_MODAL_ID,
          url: `${import.meta.env.BASE_URL}combat-effect.html?lang=${lang}&type=${effectType}`,
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

    // Focus broadcast
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

    const unsubOpenPanel = OBR.broadcast.onMessage(BROADCAST_OPEN_PANEL, () => {
      OBR.action.open();
    });

    const unsubClosePanel = OBR.broadcast.onMessage(BROADCAST_CLOSE_PANEL, () => {
      OBR.action.close();
    });

    // Dice+ roll result listener
    const unsubDiceResult = OBR.broadcast.onMessage(
      DICE_PLUS_ROLL_RESULT,
      async (event) => {
        const data = event.data as any;
        if (!data?.rollId) return;

        const rollId = data.rollId as string;
        if (!rollId.startsWith("init-")) return;
        const withoutPrefix = rollId.slice(5);
        const lastDash = withoutPrefix.lastIndexOf("-");
        const itemId = lastDash > 0 ? withoutPrefix.slice(0, lastDash) : withoutPrefix;
        const totalValue = data.result?.totalValue;
        if (typeof totalValue !== "number" || !itemId) return;

        await OBR.scene.items.updateItems([itemId], (drafts) => {
          for (const d of drafts) {
            const existing = d.metadata[METADATA_KEY] as any;
            if (existing) {
              d.metadata[METADATA_KEY] = { ...existing, count: totalValue };
            }
          }
        });

        setDiceRolling(false);
      }
    );

    // Dice+ roll error
    const unsubDiceError = OBR.broadcast.onMessage(
      DICE_PLUS_ROLL_ERROR,
      async (event) => {
        const data = event.data as any;
        if (!data?.rollId) return;
        OBR.notification.show(`Dice+ error: ${data.error || "unknown"}`);
        setDiceRolling(false);
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
    const roll = localRoll(type);
    await OBR.scene.items.updateItems([itemId], (drafts) => {
      for (const d of drafts) {
        const existing = d.metadata[METADATA_KEY] as any;
        d.metadata[METADATA_KEY] = { ...existing, count: roll };
      }
    });
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    const typeLabel = type === "disadvantage" ? " (劣势)" : type === "advantage" ? " (优势)" : "";
    OBR.notification.show(`🎲 ${item?.name ?? ""}: ${roll} [${modStr}]${typeLabel}`);
  }, [allItems]);

  // Roll via Dice+ (for players during preparation)
  const rollInitiativeDicePlus = useCallback(async (itemId: string, type: RollType) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item || item.rolled || diceRolling) return;

    const notation = diceNotation(type);

    // Lock all dice buttons and hide this item's buttons
    setDiceRolling(true);
    await OBR.scene.items.updateItems([itemId], (drafts) => {
      for (const d of drafts) {
        const existing = d.metadata[METADATA_KEY] as any;
        if (existing) {
          d.metadata[METADATA_KEY] = { ...existing, rolled: true };
        }
      }
    });

    const [playerId, playerName] = await Promise.all([
      OBR.player.getId(),
      OBR.player.getName(),
    ]);

    rollCounter++;
    await OBR.broadcast.sendMessage(DICE_PLUS_ROLL_REQUEST, {
      rollId: `init-${itemId}-${rollCounter}`,
      playerId,
      playerName,
      diceNotation: notation,
      rollTarget: "everyone",
      source: PLUGIN_ID,
      showResults: true,
      timestamp: Date.now(),
    }, { destination: "LOCAL" });
  }, [allItems, diceRolling]);

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

  const startPreparation = useCallback(async (effectType: EffectType = "prepare") => {
    if (items.length === 0) return;
    const lang = getStoredLang();

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

    setDiceRolling(false);
    await setCombatState({ preparing: true, inCombat: false, round: 0 });
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_PREPARE, { lang, effectType });
    await OBR.broadcast.sendMessage(BROADCAST_OPEN_PANEL, {});
  }, [items, allItems]);

  const startCombat = useCallback(async () => {
    if (items.length === 0) return;

    const firstId = items[0].id;
    const lang = getStoredLang();

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

  const cancelPreparation = useCallback(async () => {
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
    setDiceRolling(false);
    await setCombatState({ preparing: false, inCombat: false, round: 0 });
  }, [allItems]);

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
    prevActiveId.current = null;
    await setCombatState({ inCombat: false, preparing: false, round: 0 });
    await OBR.broadcast.sendMessage(BROADCAST_COMBAT_END, {});
    await OBR.broadcast.sendMessage(BROADCAST_CLOSE_PANEL, {});
  }, [allItems]);

  return {
    items,
    combatState,
    diceRolling,
    focusItem,
    updateCount,
    updateModifier,
    rollInitiativeLocal,
    rollInitiativeDicePlus,
    startPreparation,
    startCombat,
    cancelPreparation,
    nextTurn,
    prevTurn,
    endCombat,
  };
}
