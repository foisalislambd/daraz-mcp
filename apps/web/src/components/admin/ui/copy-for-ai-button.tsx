"use client";

import { aiSetupPrompt } from "@/lib/ai-setup-prompt";
import { useState } from "react";

export function CopyForAiButton({ mcpUrl, className = "" }: { mcpUrl?: string; className?: string }) {
  const [toast, setToast] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(aiSetupPrompt(mcpUrl));
      setToast("Copied the AI setup prompt");
    } catch {
      setToast("Could not copy. Select the prompt from the docs and copy it manually.");
    }
    window.setTimeout(() => setToast(null), 2200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        className={`h-10 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-white/5 ${className}`}
      >
        Copy for AI
      </button>
      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-gray-900"
        >
          {toast}
        </div>
      )}
    </>
  );
}
