"use client";

import { useEffect, useState } from "react";
import type { Geography } from "../geography/types";
import { readShortlist, toggleShortlist } from "./store";

export function ShortlistButton({ geo }: { geo: Geography }) {
  const [ids, setIds] = useState<string[]>([]);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const sync = () => {
      try { setIds(readShortlist(localStorage.getItem("investor-shortlist"))); }
      catch { setStorageError(true); }
    };
    sync();
    window.addEventListener("investor-shortlist-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("investor-shortlist-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const saved = ids.includes(geo.id);
  function toggle() {
    try {
      const next = toggleShortlist(readShortlist(localStorage.getItem("investor-shortlist")), geo.id);
      localStorage.setItem("investor-shortlist", JSON.stringify(next));
      setIds(next);
      window.dispatchEvent(new CustomEvent("investor-shortlist-change", { detail: next }));
    } catch { setStorageError(true); }
  }
  return <><button className="shortlist-button" onClick={toggle} disabled={storageError || (!saved && ids.length >= 20)}>{saved ? "Saved to shortlist" : ids.length >= 20 ? "Shortlist full (20 places)" : "Save to shortlist"}</button>{storageError && <p role="alert">Browser storage is unavailable. Enable storage to save places.</p>}</>;
}
