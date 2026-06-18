import { test } from "node:test"
import assert from "node:assert/strict"
// Testet die reinen Hilfsfunktionen gegen den Build-Output (dist/util.js).
// `pnpm test` baut via pretest vorher. Kein Next/React-Import -> sicher in Node.
import { timingSafeEqual, encodeClientInput, decodeClient } from "../dist/util.js"

test("timingSafeEqual: gleiche Strings -> true", () => {
  assert.equal(timingSafeEqual("s3cr3t", "s3cr3t"), true)
})

test("timingSafeEqual: gleicher Inhalt, gleiche Länge, ein Zeichen anders -> false", () => {
  assert.equal(timingSafeEqual("abcabc", "abcabd"), false)
})

test("timingSafeEqual: unterschiedliche Länge -> false", () => {
  assert.equal(timingSafeEqual("abc", "abcd"), false)
  assert.equal(timingSafeEqual("abcd", "abc"), false)
})

test("timingSafeEqual: beide leer -> true", () => {
  assert.equal(timingSafeEqual("", ""), true)
})

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

test("decodeClient: snake_case -> camelCase", () => {
  const c = decodeClient({
    id: 162905,
    secret: "abc",
    push_uri: "https://example.de/api/erecht24/push",
    cms: "Next.js",
    cms_version: "15",
    plugin_name: "dagsite/erecht24-next",
    author_mail: "dev@dagsite.com",
  })
  assert.equal(c.id, 162905)
  assert.equal(c.pushUri, "https://example.de/api/erecht24/push")
  assert.equal(c.cmsVersion, "15")
  assert.equal(c.pluginName, "dagsite/erecht24-next")
  assert.equal(c.authorMail, "dev@dagsite.com")
  assert.equal(c.pushMethod, "POST")
})
