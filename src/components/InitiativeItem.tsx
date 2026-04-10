import { useState, useRef } from "preact/compat";

interface Props {
  id: string;
  name: string;
  count: number;
  modifier: number;
  active: boolean;
  imageUrl: string;
  inCombat: boolean;
  isGM: boolean;
  onFocus: (id: string) => void;
  onUpdateCount: (id: string, count: number) => void;
  onUpdateModifier: (id: string, mod: number) => void;
  onRoll: (id: string) => void;
}

export function InitiativeItemRow({
  id, name, count, modifier, active, imageUrl,
  inCombat, isGM, onFocus, onUpdateCount, onUpdateModifier, onRoll,
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

  return (
    <div
      className={`initiative-item ${isActive ? "active" : ""}`}
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

      <div className="item-name-overlay">{name || "???"}</div>

      <div className="item-controls" onClick={(e) => e.stopPropagation()}>
        {/* Modifier field */}
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
              /* focus via ref */
            />
          ) : (
            <span className="mod-display">{modStr}</span>
          )}
        </div>

        {/* Initiative count */}
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
              /* focus via ref */
            />
          ) : (
            <span className="count-display">{count}</span>
          )}
        </div>

        {/* Roll button — GM only */}
        {isGM && (
          <button
            className="roll-btn"
            onClick={() => onRoll(id)}
            title="1d20 + modifier"
          >
            🎲
          </button>
        )}
      </div>
    </div>
  );
}
