import React from "react";
import { CombatState } from "../types";
import { Lang, t } from "../utils/i18n";

interface Props {
  combatState: CombatState;
  hasItems: boolean;
  onStartCombat: () => void;
  onPrevTurn: () => void;
  onNextTurn: () => void;
  onEndCombat: () => void;
  lang: Lang;
}

export function CombatControls({
  combatState,
  hasItems,
  onStartCombat,
  onPrevTurn,
  onNextTurn,
  onEndCombat,
  lang,
}: Props) {
  if (!combatState.inCombat) {
    return (
      <div className="combat-controls">
        <button
          className="btn btn-start"
          onClick={onStartCombat}
          disabled={!hasItems}
          title={!hasItems ? t(lang, "addFirst") : ""}
        >
          <span className="btn-icon">⚔</span> {t(lang, "startCombat")}
        </button>
      </div>
    );
  }

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
