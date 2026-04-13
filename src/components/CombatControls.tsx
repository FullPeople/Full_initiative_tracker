
import { CombatState } from "../types";
import { Lang, t } from "../utils/i18n";

interface Props {
  combatState: CombatState;
  hasItems: boolean;
  onStartPreparation: () => void;
  onStartCombat: () => void;
  onPrevTurn: () => void;
  onNextTurn: () => void;
  onEndCombat: () => void;
  lang: Lang;
}

export function CombatControls({
  combatState,
  hasItems,
  onStartPreparation,
  onStartCombat,
  onPrevTurn,
  onNextTurn,
  onEndCombat,
  lang,
}: Props) {
  // Idle: show "Start Preparation" button (yellow)
  if (!combatState.inCombat && !combatState.preparing) {
    return (
      <div className="combat-controls">
        <button
          className="btn btn-prepare"
          onClick={onStartPreparation}
          disabled={!hasItems}
          title={!hasItems ? t(lang, "addFirst") : ""}
        >
          <span className="btn-icon">⚔</span> {t(lang, "startPreparation")}
        </button>
      </div>
    );
  }

  // Preparing: show "Start Combat" button (red)
  if (combatState.preparing) {
    return (
      <div className="combat-controls">
        <button
          className="btn btn-start"
          onClick={onStartCombat}
          disabled={!hasItems}
        >
          <span className="btn-icon">⚔</span> {t(lang, "startCombat")}
        </button>
      </div>
    );
  }

  // In Combat: prev/next + end
  return (
    <div className="combat-controls">
      <div className="turn-controls">
        <button className="btn btn-prev" onClick={onPrevTurn}>
          {t(lang, "prev")}
        </button>
        <button className="btn btn-next" onClick={onNextTurn}>
          {t(lang, "next")}
        </button>
      </div>
      <button className="btn btn-end" onClick={onEndCombat}>
        {t(lang, "endCombat")}
      </button>
    </div>
  );
}
