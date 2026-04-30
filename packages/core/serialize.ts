export function serialize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "function") throw new Error("Cannot serialize: Function");
  if (typeof value === "symbol") throw new Error("Cannot serialize: Symbol");
  if (value instanceof ReadableStream) throw new Error("Cannot serialize: ReadableStream");
  if (value instanceof Request) throw new Error("Cannot serialize: Request");
  if (value instanceof Response) throw new Error("Cannot serialize: Response");
  if (value instanceof Promise) throw new Error("Cannot serialize: Promise");
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) return { __type: "Map", entries: [...value.entries()].map(([k, v]) => [serialize(k), serialize(v)]) };
  if (value instanceof Set) return { __type: "Set", values: [...value].map(v => serialize(v)) };
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

export function deserialize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(deserialize);
  const obj = value as Record<string, unknown>;
  if (obj.__type === "Map") {
    const entries = (obj.entries as Array<[unknown, unknown]>).map(([k, v]) => [deserialize(k), deserialize(v)] as [unknown, unknown]);
    return new Map(entries);
  }
  if (obj.__type === "Set") {
    return new Set((obj.values as unknown[]).map(deserialize));
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = deserialize(v);
  }
  return result;
}
