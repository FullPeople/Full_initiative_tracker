import React, { useState, useRef } from "react";

interface Props {
  id: string;
  name: string;
  count: number;
  active: boolean;
  imageUrl: string;
  inCombat: boolean;
  onFocus: (id: string) => void;
  onUpdateCount: (id: string, count: number) => void;
}

export function InitiativeItemRow({
  id,
  name,
  count,
  active,
  imageUrl,
  inCombat,
  onFocus,
  onUpdateCount,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(count));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCountClick = () => {
    setEditValue(String(count));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    setEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed !== count) {
      onUpdateCount(id, parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

  const isActive = active && inCombat;

  return (
    <div
      className={`initiative-item ${isActive ? "active" : ""}`}
      onClick={() => onFocus(id)}
      title={name}
    >
      {/* Full image background */}
      <div className="item-bg">
        {imageUrl ? (
          <img src={imageUrl} alt="" draggable={false} />
        ) : (
          <div className="item-bg-placeholder">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="item-bg-overlay" />
      </div>

      {/* Name over the image */}
      <div className="item-name-overlay">{name || "???"}</div>

      {/* Initiative count */}
      <div
        className="item-count"
        onClick={(e) => {
          e.stopPropagation();
          handleCountClick();
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            className="count-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span className="count-display">{count}</span>
        )}
      </div>
    </div>
  );
}
