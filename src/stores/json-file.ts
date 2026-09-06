import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { InMemoryStore, type MemoryState } from "./in-memory.js";
import { fail, id, json } from "../utils.js";
const owners = new Set<string>();
/** Development only: one instance per path per process; no inter-process locking. */
export class JsonFileStore extends InMemoryStore {
  readonly filePath: string;
  private loaded = false;
  private closed = false;
  constructor(path: string) {
    super();
    this.filePath = resolve(path);
    if (owners.has(this.filePath))
      fail("store_in_use", "JSON store path already open in this process.");
    owners.add(this.filePath);
  }
  protected override async load(): Promise<void> {
    if (this.closed) fail("store_closed", "Store is closed.");
    if (this.loaded) return;
    try {
      const document = JSON.parse(await readFile(this.filePath, "utf8")) as {
        version: number;
        namespaces: MemoryState;
      };
      json(document, 128 * 1024 * 1024);
      if (
        document.version !== 2 ||
        !document.namespaces ||
        Array.isArray(document.namespaces)
      )
        fail(
          "migration_required",
          "Expected v2 JSON. Use explicit legacy import; the original file is never changed automatically.",
        );
      this.state = Object.assign(
        Object.create(null),
        document.namespaces,
      ) as MemoryState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }
  protected override async persist(next: MemoryState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${id("write")}.tmp`;
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify({ version: 2, namespaces: next }));
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      await rename(temporary, this.filePath);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }
  override async close(): Promise<void> {
    await super.close();
    this.closed = true;
    owners.delete(this.filePath);
  }
}
