export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
export interface JsonArray extends Array<JsonValue> {}
export interface JsonObject { [key: string]: JsonValue; }
export type Serializable = JsonValue | Date | undefined | Map<Serializable, Serializable> | Set<Serializable> | ArrayBuffer | Uint8Array;
