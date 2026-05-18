import { useSyncExternalStore } from "react";
import imgCloudBackground from "@/assets/cloud-background.jpg";
import imgLogo161 from "@/assets/chammiles-logo.png";
import imgShade from "@/assets/window-shade.png";
import imgHandle from "@/assets/window-handle.png";

export type EditorContent = {
  texts: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    enjoyParagraph: string;
    scrollDownLabel: string;
    brandTitle: string;
    brandTagline: string;
  };
  images: {
    cloudBackground: string;
    logo: string;
    shade: string;
    handle: string;
  };
};

export const DEFAULT_CONTENT: EditorContent = {
  texts: {
    welcomeTitle: "Welcome to ChamMiles",
    welcomeSubtitle:
      "Your journey with FlyCham becomes more rewarding from the moment you join with our loyalty program",
    enjoyParagraph:
      "Enjoy priority services, seamless bookings, personalized travel experiences, and exclusive member-only access all for free.",
    scrollDownLabel: "scroll down",
    brandTitle: "FlyCham",
    brandTagline: "CHAMMILES",
  },
  images: {
    cloudBackground: imgCloudBackground,
    logo: imgLogo161,
    shade: imgShade,
    handle: imgHandle,
  },
};

const STORAGE_KEY = "flycham.editor.content.v1";
const EVENT = "flycham:editor-content-updated";

function readFromStorage(): EditorContent {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTENT;
    const parsed = JSON.parse(raw) as Partial<EditorContent>;
    return {
      texts: { ...DEFAULT_CONTENT.texts, ...(parsed.texts ?? {}) },
      images: { ...DEFAULT_CONTENT.images, ...(parsed.images ?? {}) },
    };
  } catch {
    return DEFAULT_CONTENT;
  }
}

let cache: EditorContent = DEFAULT_CONTENT;
let initialized = false;

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  cache = readFromStorage();
  initialized = true;
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    cache = readFromStorage();
    listener();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot(): EditorContent {
  ensureInit();
  return cache;
}

function getServerSnapshot(): EditorContent {
  return DEFAULT_CONTENT;
}

export function useEditorContent(): EditorContent {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function saveEditorContent(next: EditorContent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    cache = next;
    window.dispatchEvent(new Event(EVENT));
  } catch (err) {
    console.error("Failed to save editor content (likely quota exceeded):", err);
    throw err;
  }
}

export function resetEditorContent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  cache = DEFAULT_CONTENT;
  window.dispatchEvent(new Event(EVENT));
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}