import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("manifest.json", () => {
  const manifestPath = join(import.meta.dir, "..", "manifest.json");

  test("file exists", () => {
    expect(existsSync(manifestPath)).toBe(true);
  });

  test("is valid JSON", () => {
    const content = readFileSync(manifestPath, "utf-8");
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test("has manifest_version 3 (Manifest V3)", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.manifest_version).toBe(3);
  });

  test("has required name field", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.name).toBe("Facebook Emoji Suggest");
  });

  test("has required version field", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.version).toBe("1.0.0");
  });

  test("has description field", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.description).toBe("Suggest stickers while typing in Facebook Messenger");
  });

  test("has activeTab permission", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.permissions).toContain("activeTab");
  });

  test("has host_permissions for facebook.com", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.host_permissions).toContain("https://www.facebook.com/*");
    expect(manifest.host_permissions).toContain("https://facebook.com/*");
  });

  test("has background service worker configured", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBe("background.js");
    expect(manifest.background.type).toBe("module");
  });

  test("has content_scripts for facebook.com/messages", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts[0].matches).toContain("https://www.facebook.com/messages/*");
    expect(manifest.content_scripts[0].matches).toContain("https://facebook.com/messages/*");
    expect(manifest.content_scripts[0].js).toContain("content.js");
    expect(manifest.content_scripts[0].run_at).toBe("document_idle");
  });

  test("has icons configured", () => {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons["16"]).toBe("icons/icon16.png");
    expect(manifest.icons["32"]).toBe("icons/icon32.png");
    expect(manifest.icons["48"]).toBe("icons/icon48.png");
    expect(manifest.icons["128"]).toBe("icons/icon128.png");
  });
});
