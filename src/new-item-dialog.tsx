import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import { NewItemDialog } from "./components/NewItemDialog";
import "./styles/effects.css";

function NewItemDialogPage() {
  const [ready, setReady] = useState(false);
  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [lang, setLang] = useState("zh");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setItemId(params.get("itemId") || "");
    setItemName(params.get("itemName") || "");
    setLang(params.get("lang") || "zh");

    OBR.onReady(() => setReady(true));
  }, []);

  if (!ready || !itemId) return null;

  return <NewItemDialog itemId={itemId} itemName={itemName} lang={lang} />;
}

const root = createRoot(document.getElementById("root")!);
root.render(<NewItemDialogPage />);
