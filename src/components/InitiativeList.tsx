
import { InitiativeItem } from "../types";
import { InitiativeItemRow } from "./InitiativeItem";
import { RollType } from "../hooks/useInitiative";
import { Lang, t } from "../utils/i18n";

interface Props {
  items: InitiativeItem[];
  inCombat: boolean;
  preparing: boolean;
  isGM: boolean;
  onFocus: (id: string) => void;
  onUpdateCount: (id: string, count: number) => void;
  onUpdateModifier: (id: string, mod: number) => void;
  onRoll: (id: string, type: RollType) => void;
  lang: Lang;
}

export function InitiativeList({
  items, inCombat, preparing, isGM, onFocus, onUpdateCount, onUpdateModifier, onRoll, lang,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚔</div>
        <div className="empty-text">{t(lang, "noCharacters")}</div>
        <div className="empty-hint">{t(lang, "rightClickHint")}</div>
      </div>
    );
  }

  return (
    <div className="initiative-list">
      {items.map((item) => (
        <InitiativeItemRow
          key={item.id}
          id={item.id}
          name={item.name}
          count={item.count}
          modifier={item.modifier}
          active={item.active}
          rolled={item.rolled}
          imageUrl={item.imageUrl}
          inCombat={inCombat}
          preparing={preparing}
          isGM={isGM}
          onFocus={onFocus}
          onUpdateCount={onUpdateCount}
          onUpdateModifier={onUpdateModifier}
          onRoll={onRoll}
        />
      ))}
    </div>
  );
}
