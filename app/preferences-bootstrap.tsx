"use client";

import { useEffect } from "react";

export default function PreferencesBootstrap(){
  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem("duda-interface-preferences");
      const prefs=raw?JSON.parse(raw):{};
      document.documentElement.classList.toggle("duda-large-text",!!prefs.largeText);
      document.documentElement.classList.toggle("duda-high-contrast",!!prefs.highContrast);
    }catch{}
  },[]);
  return null;
}
