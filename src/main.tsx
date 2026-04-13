import { render } from "preact";
import { useEffect, useState, useRef, useCallback, createContext } from "preact/compat";
import OBR from "@owlbear-rodeo/sdk";
import { InitiativeList } from "./components/InitiativeList";
import { CombatControls } from "./components/CombatControls";
import { useInitiative, RollType } from "./hooks/useInitiative";
import { usePlayerRole } from "./hooks/usePlayerRole";
import {
  METADATA_KEY,
  COMBAT_STATE_KEY,
  NEW_ITEM_DIALOG_ID,
} from "./utils/constants";
import { Lang, t, getStoredLang, setStoredLang } from "./utils/i18n";
import "./styles/initiative.css";

export const LangContext = createContext<Lang>("en");

function App() {
  const role = usePlayerRole();
  const [lang, setLang] = useState<Lang>(getStoredLang);
  const {
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
  } = useInitiative();

  const isGM = role === "GM";
  const knownItemIds = useRef(new Set<string>());

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    setStoredLang(newLang);
  };

  // Roll handler: GM always local, players use Dice+ during preparation
  const handleRoll = useCallback(async (itemId: string, type: RollType) => {
    if (isGM || combatState.inCombat) {
      // GM or in-combat: local roll, no Dice+ integration
      await rollInitiativeLocal(itemId, type);
    } else if (combatState.preparing) {
      // Player during preparation: Dice+ integration
      await rollInitiativeDicePlus(itemId, type);
    }
  }, [isGM, combatState, rollInitiativeLocal, rollInitiativeDicePlus]);

  // Register context menu — re-register when lang changes
  useEffect(() => {
    OBR.contextMenu.create({
      id: `${METADATA_KEY}/context-menu`,
      icons: [
        {
          icon: `${import.meta.env.BASE_URL}icon.svg`,
          label: t(lang, "addToInitiative"),
          filter: {
            every: [
              { key: "type", value: "IMAGE" },
              { key: ["metadata", METADATA_KEY], value: undefined },
            ],
          },
        },
        {
          icon: `${import.meta.env.BASE_URL}icon.svg`,
          label: t(lang, "removeFromInitiative"),
          filter: {
            every: [
              { key: "type", value: "IMAGE" },
            ],
            some: [
              { key: ["metadata", METADATA_KEY], value: undefined, operator: "!=" },
            ],
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
            }
          });
          OBR.notification.show(t(lang, "removed"));
        } else {
          await OBR.scene.items.updateItems(ids, (drafts) => {
            for (const d of drafts) {
              d.metadata[METADATA_KEY] = { count: 0, active: false, rolled: false };
            }
          });
          OBR.notification.show(t(lang, "added"));
        }
      },
    });
  }, [lang]);

  // Track new items during combat or preparation (GM only)
  useEffect(() => {
    if (!isGM) return;

    const initKnown = async () => {
      const allItems = await OBR.scene.items.getItems(
        (item) =>
          item.type === "IMAGE" &&
          (item.layer === "CHARACTER" || item.layer === "MOUNT")
      );
      knownItemIds.current = new Set(allItems.map((i) => i.id));
    };
    initKnown();

    return OBR.scene.items.onChange(async (sceneItems) => {
      const metadata = await OBR.scene.getMetadata();
      const combat = metadata[COMBAT_STATE_KEY] as
        | { inCombat: boolean; preparing: boolean }
        | undefined;

      const characterItems = sceneItems.filter(
        (i) =>
          i.type === "IMAGE" &&
          (i.layer === "CHARACTER" || i.layer === "MOUNT")
      );

      const isActive = combat?.inCombat || combat?.preparing;

      if (!isActive) {
        knownItemIds.current = new Set(characterItems.map((i) => i.id));
        return;
      }

      for (const item of characterItems) {
        if (
          !knownItemIds.current.has(item.id) &&
          !item.metadata[METADATA_KEY]
        ) {
          knownItemIds.current.add(item.id);
          OBR.modal.open({
            id: NEW_ITEM_DIALOG_ID,
            url: `${import.meta.env.BASE_URL}new-item-dialog.html?itemId=${item.id}&itemName=${encodeURIComponent(item.name)}&lang=${getStoredLang()}`,
            width: 300,
            height: 240,
          });
        }
      }

      knownItemIds.current = new Set(characterItems.map((i) => i.id));
    });
  }, [isGM]);

  // Dynamic height — debounced, only update on significant change
  useEffect(() => {
    let lastHeight = 0;
    let timer: ReturnType<typeof setTimeout>;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.min(Math.ceil(entry.contentRect.height) + 2, 600);
        const clamped = Math.max(height, 100);
        if (Math.abs(clamped - lastHeight) > 5) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            lastHeight = clamped;
            OBR.action.setHeight(clamped);
          }, 100);
        }
      }
    });

    const root = document.getElementById("root");
    if (root) observer.observe(root);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, []);

  return (
    <LangContext.Provider value={lang}>
      <div className="app-container">
        <div className="app-header">
          <div className="header-title">
            <span className="icon">⚔</span>
            <span>{t(lang, "initiative")}</span>
          </div>

          <div className="header-center">
            <select
              className="lang-select"
              value={lang}
              onChange={(e) => changeLang((e.target as HTMLSelectElement).value as Lang)}
            >
              <option value="en">EN</option>
              <option value="zh">中文</option>
            </select>
            <span className="hint-icon" title={t(lang, "dragHint")}>?</span>
          </div>

          {combatState.preparing && (
            <span className="round-badge preparing">
              {t(lang, "preparing")}
            </span>
          )}

          {combatState.inCombat && (
            <span className="round-badge">
              {t(lang, "round")} {combatState.round}
            </span>
          )}
        </div>

        <InitiativeList
          items={items}
          inCombat={combatState.inCombat}
          preparing={combatState.preparing}
          isGM={isGM}
          onFocus={focusItem}
          onUpdateCount={updateCount}
          onUpdateModifier={updateModifier}
          onRoll={handleRoll}
          lang={lang}
        />

        {isGM && (
          <CombatControls
            combatState={combatState}
            hasItems={items.length > 0}
            onStartPreparation={startPreparation}
            onStartCombat={startCombat}
            onPrevTurn={prevTurn}
            onNextTurn={nextTurn}
            onEndCombat={endCombat}
            lang={lang}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}

function PluginGate() {
  const [ready, setReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    OBR.onReady(() => {
      setReady(true);
      OBR.scene.isReady().then(setSceneReady);
      OBR.scene.onReadyChange(setSceneReady);
    });
  }, []);

  if (!ready || !sceneReady) {
    return (
      <div className="app-container">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  return <App />;
}

render(<PluginGate />, document.getElementById("root")!);
