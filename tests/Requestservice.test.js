/**
 * Unit tests for request service business rules.
 * Uses mocked Vibe model and socket — no DB or network required.
 */

jest.mock("../src/socket", () => ({
  getIO: () => ({ to: () => ({ emit: jest.fn() }) }),
}));

const mongoose = require("mongoose");

function makeId() {
  return new mongoose.Types.ObjectId();
}

function makeVibe(overrides = {}) {
  const hostId = makeId();
  return {
    _id: makeId(),
    hostId,
    maxPeople: 5,
    participants: [hostId],
    requests: [],
    expiresAt: new Date(Date.now() + 3_600_000),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

jest.mock("../src/models/vibe");
const Vibe = require("../src/models/vibe");

const {
  sendJoinRequest,
  respondToRequest,
} = require("../src/services/requestService");

describe("sendJoinRequest", () => {
  afterEach(() => jest.clearAllMocks());

  it("throws 404 when vibe not found", async () => {
    Vibe.findById = jest.fn().mockResolvedValue(null);
    await expect(sendJoinRequest(makeId(), makeId())).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 410 when vibe is expired", async () => {
    Vibe.findById = jest
      .fn()
      .mockResolvedValue(makeVibe({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(sendJoinRequest(makeId(), makeId())).rejects.toMatchObject({
      status: 410,
    });
  });

  it("throws 400 when host tries to join own vibe", async () => {
    const hostId = makeId();
    Vibe.findById = jest.fn().mockResolvedValue(makeVibe({ hostId }));
    await expect(sendJoinRequest(makeId(), hostId)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("throws 409 when vibe is full", async () => {
    const vibe = makeVibe({ maxPeople: 2 });
    vibe.participants = [makeId(), makeId()];
    Vibe.findById = jest.fn().mockResolvedValue(vibe);
    await expect(sendJoinRequest(vibe._id, makeId())).rejects.toMatchObject({
      status: 409,
    });
  });

  it("throws 409 on duplicate pending request", async () => {
    const userId = makeId();
    const vibe = makeVibe();
    vibe.requests = [{ userId, status: "pending", equals: () => true }];
    vibe.requests[0].userId = {
      equals: (id) => id.toString() === userId.toString(),
    };
    Vibe.findById = jest.fn().mockResolvedValue(vibe);
    await expect(sendJoinRequest(vibe._id, userId)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("adds request and saves on valid join", async () => {
    const vibe = makeVibe();
    Vibe.findById = jest.fn().mockResolvedValue(vibe);
    await sendJoinRequest(vibe._id, makeId());
    expect(vibe.requests).toHaveLength(1);
    expect(vibe.save).toHaveBeenCalledTimes(1);
  });
});

describe("respondToRequest", () => {
  afterEach(() => jest.clearAllMocks());

  it("throws 403 when non-host tries to respond", async () => {
    const vibe = makeVibe();
    Vibe.findById = jest.fn().mockResolvedValue(vibe);
    await expect(
      respondToRequest(vibe._id, makeId().toString(), makeId(), "approved"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("adds user to participants on approve", async () => {
    const userId = makeId();
    const vibe = makeVibe();
    vibe.requests = [
      {
        userId: { toString: () => userId.toString(), equals: () => false },
        status: "pending",
      },
    ];
    vibe.requests[0].userId.toString = () => userId.toString();
    Vibe.findById = jest.fn().mockResolvedValue(vibe);

    await respondToRequest(
      vibe._id,
      userId.toString(),
      vibe.hostId,
      "approved",
    );
    expect(vibe.participants).toContain(userId.toString());
  });
});
