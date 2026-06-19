import { test } from "node:test"
import assert from "node:assert/strict"
// Reine Entscheidungslogik des Webhook-Handlers (kein Next-Import) gegen dist.
import { decidePush } from "../dist/push-core.js"

const SECRET = "topsecret-abc-123"
const PATHS = {
  imprint: "/impressum",
  privacyPolicy: "/datenschutz",
  privacyPolicySocialMedia: "/datenschutz",
}

test("fehlendes Secret -> 422", () => {
  const d = decidePush({ erecht24_type: "imprint" }, SECRET, PATHS)
  assert.equal(d.action, "respond")
  assert.equal(d.status, 422)
})

test("fehlender Typ -> 422", () => {
  const d = decidePush({ erecht24_secret: SECRET }, SECRET, PATHS)
  assert.equal(d.status, 422)
})

test("falsches Secret -> 401", () => {
  const d = decidePush(
    { erecht24_secret: "nope", erecht24_type: "imprint" },
    SECRET,
    PATHS,
  )
  assert.equal(d.status, 401)
})

test("ping -> 200 pong", () => {
  const d = decidePush(
    { erecht24_secret: SECRET, erecht24_type: "ping" },
    SECRET,
    PATHS,
  )
  assert.equal(d.action, "respond")
  assert.equal(d.status, 200)
  assert.equal(d.body.message, "pong")
})

test("unbekannter Typ -> 422", () => {
  const d = decidePush(
    { erecht24_secret: SECRET, erecht24_type: "foobar" },
    SECRET,
    PATHS,
  )
  assert.equal(d.status, 422)
})

test("Prototype-Key 'constructor' -> 422 (kein Bypass)", () => {
  const d = decidePush(
    { erecht24_secret: SECRET, erecht24_type: "constructor" },
    SECRET,
    PATHS,
  )
  assert.equal(d.action, "respond")
  assert.equal(d.status, 422)
})

test("Prototype-Key '__proto__' -> 422", () => {
  const d = decidePush(
    { erecht24_secret: SECRET, erecht24_type: "__proto__" },
    SECRET,
    PATHS,
  )
  assert.equal(d.status, 422)
})

test("Prototype-Key 'toString' -> 422", () => {
  const d = decidePush(
    { erecht24_secret: SECRET, erecht24_type: "toString" },
    SECRET,
    PATHS,
  )
  assert.equal(d.status, 422)
})

test("gültiger imprint -> revalidate mit korrektem Tag + Pfad", () => {
  const d = decidePush(
    { erecht24_secret: SECRET, erecht24_type: "imprint" },
    SECRET,
    PATHS,
  )
  assert.equal(d.action, "revalidate")
  assert.equal(d.tag, "erecht24:imprint")
  assert.equal(d.path, "/impressum")
})

test("gültiger privacyPolicy -> revalidate", () => {
  const d = decidePush(
    { erecht24_secret: SECRET, erecht24_type: "privacyPolicy" },
    SECRET,
    PATHS,
  )
  assert.equal(d.action, "revalidate")
  assert.equal(d.tag, "erecht24:privacyPolicy")
  assert.equal(d.path, "/datenschutz")
})

test("Nicht-Objekt-Payload -> 422 (kein Crash)", () => {
  assert.equal(decidePush(null, SECRET, PATHS).status, 422)
  assert.equal(decidePush("x", SECRET, PATHS).status, 422)
})
