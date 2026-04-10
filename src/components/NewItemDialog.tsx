import React, { useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { METADATA_KEY, NEW_ITEM_DIALOG_ID } from "../utils/constants";

interface Props {
  itemId: string;
  itemName: string;
}

export function NewItemDialog({ itemId, itemName }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = async () => {
    const count = parseFloat(value);
    if (isNaN(count)) return;

    await OBR.scene.items.updateItems([itemId], (items) => {
      for (const item of items) {
        item.metadata[METADATA_KEY] = { count, active: false };
      }
    });
    OBR.modal.close(NEW_ITEM_DIALOG_ID);
  };

  const handleCancel = () => {
    OBR.modal.close(NEW_ITEM_DIALOG_ID);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="new-item-dialog">
      <div className="dialog-title">Set Initiative</div>
      <div className="dialog-name">{itemName || "New Character"}</div>
      <input
        type="number"
        className="dialog-input"
        placeholder="Initiative value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="dialog-buttons">
        <button className="btn btn-cancel" onClick={handleCancel}>
          Skip
        </button>
        <button className="btn btn-confirm" onClick={handleSubmit}>
          Add
        </button>
      </div>
    </div>
  );
}
