import * as assert from "node:assert/strict";
import { getGalleryPublicAccess } from "../src/lib/gallery-public-access";
import { buildQrApiUrl, filterShareReadyGalleries, isGalleryShareReady, normalizeQrSize } from "../src/lib/qr";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("public access: allows published active gallery", () => {
  const result = getGalleryPublicAccess({
    settings: {
      published: true,
      allowSingleDownload: true,
      allowBulkDownload: false,
      oneQrEnabled: true,
    },
    meta: {
      favoritesEnabled: true,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  assert.equal(result.canAccess, true);
  assert.equal(result.expired, false);
  assert.equal(result.allowSingleDownload, true);
  assert.equal(result.allowBulkDownload, false);
  assert.equal(result.favoritesEnabled, true);
  assert.equal(result.oneQrEnabled, true);
});

run("public access: blocks unpublished", () => {
  const result = getGalleryPublicAccess({
    settings: { published: false },
    meta: {},
  });
  assert.equal(result.canAccess, false);
});

run("public access: blocks expired", () => {
  const result = getGalleryPublicAccess({
    settings: { published: true },
    meta: {
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    },
  });
  assert.equal(result.expired, true);
  assert.equal(result.canAccess, false);
});

run("public access: defaults are safe", () => {
  const result = getGalleryPublicAccess({
    settings: null,
    meta: null,
  });
  assert.equal(result.canAccess, true);
  assert.equal(result.allowSingleDownload, true);
  assert.equal(result.allowBulkDownload, false);
  assert.equal(result.favoritesEnabled, true);
});

run("qr helper: normalizes size", () => {
  assert.equal(normalizeQrSize("64"), 128);
  assert.equal(normalizeQrSize("320"), 320);
  assert.equal(normalizeQrSize("2048"), 1024);
  assert.equal(normalizeQrSize("abc"), 320);
});

run("qr helper: share-ready rules", () => {
  const active = {
    published: true,
    oneQrEnabled: true,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const unpublished = { ...active, published: false };
  const qrDisabled = { ...active, oneQrEnabled: false };
  const expired = { ...active, expiresAt: new Date(Date.now() - 60_000).toISOString() };

  assert.equal(isGalleryShareReady(active), true);
  assert.equal(isGalleryShareReady(unpublished), false);
  assert.equal(isGalleryShareReady(qrDisabled), false);
  assert.equal(isGalleryShareReady(expired), false);
});

run("qr helper: filters share-ready galleries", () => {
  const input = [
    { id: "1", published: true, oneQrEnabled: true, expiresAt: null },
    { id: "2", published: false, oneQrEnabled: true, expiresAt: null },
    { id: "3", published: true, oneQrEnabled: false, expiresAt: null },
  ];
  const output = filterShareReadyGalleries(input);
  assert.deepEqual(output.map((item) => item.id), ["1"]);
});

run("qr helper: builds encoded internal url", () => {
  const url = buildQrApiUrl("https://pixora.app/disk/my gallery", 512);
  assert.ok(url.startsWith("/api/qr?size=512&data="));
  assert.ok(url.includes("my%20gallery"));
});

import { parseEmail, parseOtpCode } from "../src/modules/user/schema";

run("user schema: parseEmail normalizes and validates", () => {
  assert.equal(parseEmail("TEST@Example.COM"), "test@example.com");
  assert.equal(parseEmail("not-an-email"), null);
});

run("user schema: parseOtpCode extracts 6-digit codes", () => {
  assert.equal(parseOtpCode(" 123456 "), "123456");
  assert.equal(parseOtpCode("abc123"), null);
});

console.log("All unit checks passed.");
