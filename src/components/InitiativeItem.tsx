import { useState, useRef } from "preact/compat";
import { RollType } from "../hooks/useInitiative";

interface Props {
  id: string;
  name: string;
  count: number;
  modifier: number;
  active: boolean;
  rolled: boolean;
  imageUrl: string;
  inCombat: boolean;
  preparing: boolean;
  isGM: boolean;
  onFocus: (id: string) => void;
  onUpdateCount: (id: string, count: number) => void;
  onUpdateModifier: (id: string, mod: number) => void;
  onRoll: (id: string, type: RollType) => void;
}

export function InitiativeItemRow({
  id, name, count, modifier, active, rolled, imageUrl,
  inCombat, preparing, isGM, onFocus, onUpdateCount, onUpdateModifier, onRoll,
}: Props) {
  const [editingCount, setEditingCount] = useState(false);
  const [editingMod, setEditingMod] = useState(false);
  const [countVal, setCountVal] = useState(String(count));
  const [modVal, setModVal] = useState(String(modifier));
  const countRef = useRef<HTMLInputElement>(null);
  const modRef = useRef<HTMLInputElement>(null);

  const commitCount = () => {
    setEditingCount(false);
    const p = parseFloat(countVal);
    if (!isNaN(p) && p !== count) onUpdateCount(id, p);
  };

  const commitMod = () => {
    setEditingMod(false);
    const p = parseInt(modVal);
    if (!isNaN(p) && p !== modifier) onUpdateModifier(id, p);
  };

  const isActive = active && inCombat;
  const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  // Show roll buttons?
  // Preparing: all players see buttons, hide if rolled (unless GM)
  // In Combat: GM only, always visible
  const showRollButtons =
    (preparing && (!rolled || isGM)) ||
    (inCombat && isGM);

  return (
    <div
      className={`initiative-item ${isActive ? "active" : ""} ${preparing ? "preparing" : ""}`}
      onClick={() => onFocus(id)}
      title={name}
    >
      <div className="item-bg">
        {imageUrl ? (
          <img src={imageUrl} alt="" draggable={false} />
        ) : (
          <div className="item-bg-placeholder">{name.charAt(0).toUpperCase()}</div>
        )}
        <div className="item-bg-overlay" />
      </div>

      <div className="item-spacer" />

      <div className="item-controls" onClick={(e) => e.stopPropagation()}>
        {/* Modifier */}
        <div
          className="mod-field"
          onClick={() => {
            setModVal(String(modifier));
            setEditingMod(true);
            setTimeout(() => modRef.current?.select(), 0);
          }}
        >
          {editingMod ? (
            <input
              ref={modRef}
              type="number"
              className="mod-input"
              value={modVal}
              onInput={(e) => setModVal((e.target as HTMLInputElement).value)}
              onBlur={commitMod}
              onKeyDown={(e) => { if (e.key === "Enter") commitMod(); if (e.key === "Escape") setEditingMod(false); }}
            />
          ) : (
            <span className="mod-display">{modStr}</span>
          )}
        </div>

        {/* Count */}
        <div
          className="item-count"
          onClick={() => {
            setCountVal(String(count));
            setEditingCount(true);
            setTimeout(() => countRef.current?.select(), 0);
          }}
        >
          {editingCount ? (
            <input
              ref={countRef}
              type="number"
              className="count-input"
              value={countVal}
              onInput={(e) => setCountVal((e.target as HTMLInputElement).value)}
              onBlur={commitCount}
              onKeyDown={(e) => { if (e.key === "Enter") commitCount(); if (e.key === "Escape") setEditingCount(false); }}
            />
          ) : (
            <span className="count-display">{count}</span>
          )}
        </div>

        {/* Roll buttons: 劣 / 🎲 / 优 */}
        {showRollButtons && (
          <div className="roll-buttons">
            <button
              className="roll-btn roll-dis"
              onClick={() => onRoll(id, "disadvantage")}
              title="2d20kl1 (Disadvantage)"
            >
              劣
            </button>
            <button
              className="roll-btn roll-normal"
              onClick={() => onRoll(id, "normal")}
              title="1d20"
            >
              🎲
            </button>
            <button
              className="roll-btn roll-adv"
              onClick={() => onRoll(id, "advantage")}
              title="2d20kh1 (Advantage)"
            >
              优
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
