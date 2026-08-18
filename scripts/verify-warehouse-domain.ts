import assert from "node:assert/strict"
import {
  actorCanSetStatus,
  assertGatePassTransition,
  canTransitionGatePass,
  createOpaqueToken,
  hashOpaqueToken,
  operationalDateKey,
  parseOperationalDate,
  positiveWholeNumber,
} from "../src/lib/warehouse/gatepass-domain"

const malaysiaMorning = parseOperationalDate("2026-08-18T09:30", "Pickup time")
assert.equal(malaysiaMorning.toISOString(), "2026-08-18T01:30:00.000Z")
assert.equal(operationalDateKey(malaysiaMorning), "20260818")

const malaysiaJustAfterMidnight = new Date("2026-08-17T16:30:00.000Z")
assert.equal(operationalDateKey(malaysiaJustAfterMidnight), "20260818")

assert.equal(canTransitionGatePass("DRAFT", "AWAITING_CUSTOMER"), true)
assert.equal(canTransitionGatePass("DRAFT", "LOADING"), false)
assert.doesNotThrow(() => assertGatePassTransition("READY_FOR_PICKUP", "CHECKED_IN"))
assert.throws(() => assertGatePassTransition("READY_FOR_PICKUP", "CHECKED_OUT"))

assert.equal(actorCanSetStatus("SECURITY", "CHECKED_IN"), true)
assert.equal(actorCanSetStatus("SECURITY", "LOADING"), false)
assert.equal(actorCanSetStatus("WAREHOUSE", "LOADING"), true)
assert.equal(actorCanSetStatus("REQUESTER", "CHECKED_OUT"), false)

assert.equal(positiveWholeNumber("5", "Quantity"), 5)
assert.throws(() => positiveWholeNumber(0, "Quantity"))
assert.equal(positiveWholeNumber(0, "Quantity", true), 0)

const token = createOpaqueToken()
assert.ok(token.length >= 40)
assert.equal(hashOpaqueToken(token), hashOpaqueToken(token))
assert.notEqual(hashOpaqueToken(token), hashOpaqueToken(`${token}x`))

console.log(JSON.stringify({
  passed: true,
  checks: 18,
  malaysiaDateTime: malaysiaMorning.toISOString(),
  malaysiaDateKey: operationalDateKey(malaysiaMorning),
}, null, 2))
