import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AI_SETUP_PROMPT, aiSetupPrompt } from "../src/lib/ai-setup-prompt";

describe("AI setup prompt", () => {
  it("matches the docs file and fills only the MCP URL", () => {
    const file = readFileSync(fileURLToPath(new URL("../../../docs/AI_SETUP_PROMPT.md", import.meta.url)), "utf8");
    expect(file.trim()).toBe(AI_SETUP_PROMPT.trim());
    const filled = aiSetupPrompt("https://panel.example/mcp");
    expect(filled).toContain("https://panel.example/mcp");
    expect(filled).not.toContain("https://YOUR_HOST/mcp");
    expect(filled).not.toMatch(/dk_live_[A-Za-z0-9]{20,}/);
    expect(aiSetupPrompt("")).toContain("https://YOUR_HOST/mcp");
  });
});
