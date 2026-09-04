import { randomUUID } from "node:crypto";
import type { JsonObject, JsonValue } from "./contracts.js";

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function assertNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} must not be empty.`);
  }
  return normalized;
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function getPath(root: unknown, path: string): JsonValue | undefined {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = root;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return isJsonValue(current) ? current : undefined;
}

export function mergeJsonObjects(left: JsonObject, right: JsonObject | undefined): JsonObject {
  return right ? { ...left, ...right } : { ...left };
}

export function stableJson(value: JsonValue | undefined): string {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);
  return `{${entries.join(",")}}`;
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

export function timestampInRange(timestamp: string, since?: string, until?: string): boolean {
  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) {
    return false;
  }

  if (since && value < Date.parse(since)) {
    return false;
  }
  if (until && value > Date.parse(until)) {
    return false;
  }
  return true;
}

