import { afterEach, describe, expect, it, vi } from "vitest";
import { sha256File } from "../../app/utils/sha256";

describe("sha256 file digest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("computes the standard SHA-256 digest without crypto.subtle", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "request-1" });

    await expect(sha256File(new File(["hello"], "hello.txt", { type: "text/plain" })))
      .resolves.toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("handles input spanning multiple SHA-256 blocks", async () => {
    vi.stubGlobal("crypto", {});

    await expect(sha256File(new File(["a".repeat(1000)], "multi-block.txt")))
      .resolves.toBe("41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3");
  });

  it("hashes files across the incremental fallback chunk boundary", async () => {
    vi.stubGlobal("crypto", {});

    await expect(sha256File(new File(["a".repeat(1024 * 1024 + 17)], "large.txt")))
      .resolves.toBe("c26032d5154f96bd29c799447d715ab681d8d0aa308ecc6f321a35d98f0672da");
  });
});
