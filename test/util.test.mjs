import { test } from "node:test"
import assert from "node:assert/strict"
// Reine Hilfsfunktionen gegen den Build-Output (dist/util.js). `pnpm test` baut
// via pretest vorher. Kein Next/React-Import -> sicher in Node.
import {
  timingSafeEqual,
  encodeClientInput,
  decodeClient,
  parseJsonBody,
  legalTextTag,
} from "../dist/util.js"

// --- timingSafeEqual ---
test("timingSafeEqual: gleiche Strings -> true", () => {
  assert.equal(timingSafeEqual("s3cr3t", "s3cr3t"), true)
})
test("timingSafeEqual: gleiche Länge, ein Zeichen anders -> false", () => {
  assert.equal(timingSafeEqual("abcabc", "abcabd"), false)
})
test("timingSafeEqual: unterschiedliche Länge -> false", () => {
  assert.equal(timingSafeEqual("abc", "abcd"), false)
  assert.equal(timingSafeEqual("abcd", "abc"), false)
})
test("timingSafeEqual: beide leer -> true", () => {
  assert.equal(timingSafeEqual("", ""), true)
})
test("timingSafeEqual: leer vs nicht-leer -> false (|| 0 Fallback)", () => {
  assert.equal(timingSafeEqual("", "a"), false)
  assert.equal(timingSafeEqual("a", ""), false)
})

// --- legalTextTag ---
test("legalTextTag", () => {
  assert.equal(legalTextTag("imprint"), "erecht24:imprint")
})

// --- encodeClientInput ---
test("encodeClientInput: camelCase -> snake_case", () => {
  const out = encodeClientInput({
    pushUri: "https://example.de/api/erecht24/push",
    cms: "Next.js",
    cmsVersion: "15",
    pluginName: "dagsite/erecht24-next",
    authorMail: "dev@dagsite.com",
  })
  assert.equal(out.push_uri, "https://example.de/api/erecht24/push")
  assert.equal(out.push_method, "POST")
  assert.equal(out.cms, "Next.js")
  assert.equal(out.cms_version, "15")
  assert.equal(out.plugin_name, "dagsite/erecht24-next")
  assert.equal(out.author_mail, "dev@dagsite.com")
})

// --- decodeClient ---
test("decodeClient: snake_case + created_at/updated_at -> camelCase", () => {
  const c = decodeClient({
    id: 162905,
    secret: "abc",
    push_uri: "https://example.de/api/erecht24/push",
    cms: "Next.js",
    cms_version: "15",
    plugin_name: "dagsite/erecht24-next",
    author_mail: "dev@dagsite.com",
    created_at: "2026-06-05 20:44:52",
    updated_at: "2026-06-18 10:00:00",
  })
  assert.equal(c.id, 162905)
  assert.equal(c.pushUri, "https://example.de/api/erecht24/push")
  assert.equal(c.cmsVersion, "15")
  assert.equal(c.pluginName, "dagsite/erecht24-next")
  assert.equal(c.authorMail, "dev@dagsite.com")
  assert.equal(c.pushMethod, "POST")
  assert.equal(c.created, "2026-06-05 20:44:52")
  assert.equal(c.modified, "2026-06-18 10:00:00")
})
test("decodeClient: toleriert camelCase + created/modified", () => {
  const c = decodeClient({
    client_id: 9,
    pushUri: "u",
    cmsVersion: "16",
    pluginName: "p",
    authorMail: "a@b.de",
    created: "x",
    modified: "y",
  })
  assert.equal(c.id, 9)
  assert.equal(c.pushUri, "u")
  assert.equal(c.cmsVersion, "16")
  assert.equal(c.created, "x")
  assert.equal(c.modified, "y")
})
test("decodeClient: fehlende id -> 0, fehlende Daten -> undefined", () => {
  const c = decodeClient({})
  assert.equal(c.id, 0)
  assert.equal(c.created, undefined)
  assert.equal(c.modified, undefined)
})

// --- parseJsonBody ---
test("parseJsonBody: leer -> undefined", () => {
  assert.equal(parseJsonBody(""), undefined)
})
test("parseJsonBody: whitespace -> undefined", () => {
  assert.equal(parseJsonBody("   \n "), undefined)
})
test("parseJsonBody: gültiges JSON -> Objekt", () => {
  assert.deepEqual(parseJsonBody('{"a":1}'), { a: 1 })
})
test("parseJsonBody: ungültiges JSON -> wirft", () => {
  assert.throws(() => parseJsonBody("{nope"))
})
