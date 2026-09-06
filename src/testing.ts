import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FeedbackStore, StoreTransaction } from "./store.js";
import { FeedbackLoop } from "./feedback-loop.js";
/** Reusable, destructive ONLY to random conformance namespaces it creates. */
export async function runStoreConformance(
  store: FeedbackStore,
): Promise<string[]> {
  const namespace = `conformance/${randomUUID()}`,
    other = `${namespace}/other`;
  const loop = new FeedbackLoop({ store, namespace }),
    second = new FeedbackLoop({ store, namespace: other });
  const results: string[] = [];
  try {
    const record = await loop.recordExecution({ id: "a", kind: "turn" });
    await second.recordExecution({ id: "a", kind: "prediction" });
    assert.equal((await loop.getExecution("a"))?.kind, "turn");
    results.push("namespace isolation");
    assert.equal(
      (await loop.recordExecution({ id: "a", kind: "turn" })).revision,
      1,
    );
    await assert.rejects(loop.recordExecution({ id: "a", kind: "tool" }));
    results.push("idempotency and conflicts");
    await assert.rejects(
      store.transaction(namespace, async (tx) => {
        await tx.insert("executions", { ...record, id: "rolled-back" });
        throw new Error("abort");
      }),
    );
    assert.equal(await loop.getExecution("rolled-back"), undefined);
    results.push("transaction rollback");
    const updates = await Promise.allSettled([
      loop.completeExecution("a", { output: 1 }, 1),
      loop.completeExecution("a", { output: 2 }, 1),
    ]);
    assert.equal(updates.filter((r) => r.status === "fulfilled").length, 1);
    results.push("revision concurrency");
    await loop.recordExecution({ id: "b", kind: "turn" });
    const page = await loop.list("executions", { limit: 1 });
    assert.equal(page.items.length, 1);
    assert.ok(page.nextCursor);
    const next = await loop.list("executions", {
      limit: 1,
      cursor: page.nextCursor,
    });
    assert.equal(next.items[0]?.id, "b");
    results.push("pagination");
    let escaped: StoreTransaction | undefined;
    await store.transaction(namespace, async (tx) => {
      escaped = tx;
    });
    await assert.rejects(escaped!.get("executions", "a"));
    results.push("transaction lifetime");
    await assert.rejects(
      store.transaction(namespace, (tx) =>
        tx.insert("executions", { ...record, namespace: other, id: "cross" }),
      ),
    );
    results.push("write isolation");
    await loop.deleteNamespace(namespace);
    assert.equal(await loop.getExecution("a"), undefined);
    assert.ok(await second.getExecution("a"));
    results.push("namespace deletion");
    return results;
  } finally {
    await store.deleteNamespace(namespace);
    await store.deleteNamespace(other);
  }
}
