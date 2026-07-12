import { describe, expect, it } from "vitest";
import { sortQueueItems } from "./room-queue";

type Item = { id: string; createdAt: string; voteScore: number };

describe("sortQueueItems", () => {
  it("orders by vote score descending", () => {
    const items: Item[] = [
      { id: "a", createdAt: "2024-01-01T00:00:00.000Z", voteScore: 1 },
      { id: "b", createdAt: "2024-01-01T00:00:01.000Z", voteScore: 5 },
      { id: "c", createdAt: "2024-01-01T00:00:02.000Z", voteScore: 3 },
    ];
    expect(sortQueueItems(items).map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks vote-score ties by earliest createdAt", () => {
    const items: Item[] = [
      { id: "a", createdAt: "2024-01-01T00:00:05.000Z", voteScore: 2 },
      { id: "b", createdAt: "2024-01-01T00:00:01.000Z", voteScore: 2 },
      { id: "c", createdAt: "2024-01-01T00:00:03.000Z", voteScore: 2 },
    ];
    expect(sortQueueItems(items).map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks a full tie (same score, same createdAt) by id", () => {
    const items: Item[] = [
      { id: "z", createdAt: "2024-01-01T00:00:00.000Z", voteScore: 0 },
      { id: "a", createdAt: "2024-01-01T00:00:00.000Z", voteScore: 0 },
      { id: "m", createdAt: "2024-01-01T00:00:00.000Z", voteScore: 0 },
    ];
    expect(sortQueueItems(items).map((i) => i.id)).toEqual(["a", "m", "z"]);
  });

  it("does not mutate the input array", () => {
    const items: Item[] = [
      { id: "a", createdAt: "2024-01-01T00:00:00.000Z", voteScore: 1 },
      { id: "b", createdAt: "2024-01-01T00:00:01.000Z", voteScore: 9 },
    ];
    const original = [...items];
    sortQueueItems(items);
    expect(items).toEqual(original);
  });

  it("handles an empty list", () => {
    expect(sortQueueItems([])).toEqual([]);
  });
});
