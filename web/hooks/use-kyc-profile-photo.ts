"use client";

import { useSyncExternalStore } from "react";

const PHOTO_KEY = "bharosa-kyc-profile-photo";
const PHOTO_EVENT = "bharosa-kyc-profile-photo-change";

function getSnapshot() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PHOTO_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PHOTO_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PHOTO_EVENT, onStoreChange);
  };
}

export function useKycProfilePhoto(fallback = "") {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) || fallback;
}

export function saveKycProfilePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const photo = String(reader.result ?? "");
      window.localStorage.setItem(PHOTO_KEY, photo);
      window.dispatchEvent(new Event(PHOTO_EVENT));
      resolve(photo);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
