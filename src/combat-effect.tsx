import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import { CombatEffect } from "./components/CombatEffect";
import { COMBAT_EFFECT_MODAL_ID } from "./utils/constants";
import "./styles/effects.css";

function CombatEffectPage() {
  const [show, setShow] = useState(false);

  // Read lang from URL query param
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || "en";

  useEffect(() => {
    OBR.onReady(() => setShow(true));
  }, []);

  const handleComplete = useCallback(() => {
    OBR.modal.close(COMBAT_EFFECT_MODAL_ID);
  }, []);

  if (!show) return null;

  return <CombatEffect onComplete={handleComplete} lang={lang} />;
}

const root = createRoot(document.getElementById("root")!);
root.render(<CombatEffectPage />);
