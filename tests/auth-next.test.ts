import { describe, expect, it } from "vitest";
import { loginHref, safeNext } from "@/lib/auth/next";

describe("safeNext（ログイン後の戻り先）", () => {
  it("サイト内のパスは通す", () => {
    expect(safeNext("/recipes/x")).toBe("/recipes/x");
    expect(safeNext("/diagnosis?a=1")).toBe("/diagnosis?a=1");
    expect(safeNext(encodeURIComponent("/recipes/x/comments"))).toBe("/recipes/x/comments");
  });

  it("外のサイト・変な値は通さない", () => {
    for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", "", null, "/\\evil.com", "/%5Cevil.com", "/a\nb", "%E0%A4%A", "evil.com"]) {
      expect(safeNext(bad), String(bad)).toBeNull();
    }
  });

  it("ログイン画面自身には戻らない", () => {
    expect(safeNext("/login")).toBeNull();
    expect(safeNext("/login?next=/x")).toBeNull();
  });

  it("loginHref", () => {
    expect(loginHref("/recipes/x")).toBe("/login?next=%2Frecipes%2Fx");
    expect(loginHref("https://evil.com")).toBe("/login");
    expect(loginHref()).toBe("/login");
  });
});
