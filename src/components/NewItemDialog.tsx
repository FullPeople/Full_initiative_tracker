import React, { useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { METADATA_KEY, NEW_ITEM_DIALOG_ID } from "../utils/constants";

interface Props {
  itemId: string;
  itemName: string;
  lang: string;
}

export function NewItemDialog({ itemId, itemName, lang }: Props) {
  const [value, setValue] = useState("");
  const isZh = lang === "zh";

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
      <div className="dialog-title">{isZh ? "设置先攻" : "Set Initiative"}</div>
      <div className="dialog-name">{itemName || (isZh ? "新角色" : "New Character")}</div>
      <input
        type="number"
        className="dialog-input"
        placeholder={isZh ? "先攻值" : "Initiative"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="dialog-buttons">
        <button className="btn btn-cancel" onClick={handleCancel}>
          {isZh ? "跳过" : "Skip"}
        </button>
        <button className="btn btn-confirm" onClick={handleSubmit}>
          {isZh ? "添加" : "Add"}
        </button>
      </div>
    </div>
  );
}
