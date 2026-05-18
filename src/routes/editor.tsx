import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  DEFAULT_CONTENT,
  type EditorContent,
  fileToDataUrl,
  resetEditorContent,
  saveEditorContent,
  useEditorContent,
} from "@/lib/editorContent";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Local content editor — ChamMiles" },
      { name: "description", content: "Edit text and images locally; changes are stored in your browser only." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EditorPage,
});

const TEXT_FIELDS: { key: keyof EditorContent["texts"]; label: string; multiline?: boolean }[] = [
  { key: "welcomeTitle", label: "Welcome title" },
  { key: "welcomeSubtitle", label: "Welcome subtitle", multiline: true },
  { key: "enjoyParagraph", label: "Closing paragraph", multiline: true },
  { key: "scrollDownLabel", label: "Scroll-down label" },
  { key: "brandTitle", label: "Header brand" },
  { key: "brandTagline", label: "Header tagline" },
];

const IMAGE_FIELDS: { key: keyof EditorContent["images"]; label: string; hint: string }[] = [
  { key: "cloudBackground", label: "Cloud background", hint: "Sky behind the windows" },
  { key: "logo", label: "Logo", hint: "Shown under welcome text" },
  { key: "shade", label: "Window shade", hint: "Pull-down panel texture" },
  { key: "handle", label: "Window handle", hint: "Sash grip" },
];

function EditorPage() {
  const stored = useEditorContent();
  const [draft, setDraft] = useState<EditorContent>(stored);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(stored);
  }, [stored]);

  const updateText = (key: keyof EditorContent["texts"], value: string) => {
    setDraft((d) => ({ ...d, texts: { ...d.texts, [key]: value } }));
  };

  const updateImageFromFile = async (key: keyof EditorContent["images"], file: File) => {
    try {
      const url = await fileToDataUrl(file);
      setDraft((d) => ({ ...d, images: { ...d.images, [key]: url } }));
    } catch {
      setError("Could not read that file. Try a smaller image.");
    }
  };

  const resetImage = (key: keyof EditorContent["images"]) => {
    setDraft((d) => ({ ...d, images: { ...d.images, [key]: DEFAULT_CONTENT.images[key] } }));
  };

  const handleSave = () => {
    setError(null);
    try {
      saveEditorContent(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      setError("Saving failed — your browser storage is full. Try smaller images.");
    }
  };

  const handleReset = () => {
    resetEditorContent();
    setDraft(DEFAULT_CONTENT);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Local content editor</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Edit text and swap images. Changes are saved in this browser only (localStorage)
              and won't affect other visitors.
            </p>
          </div>
          <a
            href="/"
            className="shrink-0 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            View site
          </a>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Texts</h2>
          <div className="grid gap-4">
            {TEXT_FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{f.label}</span>
                {f.multiline ? (
                  <textarea
                    rows={3}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.texts[f.key]}
                    onChange={(e) => updateText(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.texts[f.key]}
                    onChange={(e) => updateText(f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Images</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {IMAGE_FIELDS.map((f) => {
              const isCustom = draft.images[f.key] !== DEFAULT_CONTENT.images[f.key];
              return (
                <div key={f.key} className="rounded-lg border border-input p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.hint}</div>
                    </div>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => resetImage(f.key)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        reset
                      </button>
                    )}
                  </div>
                  <div className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-md bg-muted">
                    <img
                      src={draft.images[f.key]}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void updateImageFromFile(f.key, file);
                      e.target.value = "";
                    }}
                    className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:opacity-90"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border border-input bg-background/95 p-3 backdrop-blur">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Reset to defaults
          </button>
          {saved && <span className="text-sm text-muted-foreground">Saved ✓</span>}
          <span className="ml-auto text-xs text-muted-foreground">
            Stored locally in your browser only.
          </span>
        </div>
      </div>
    </div>
  );
}