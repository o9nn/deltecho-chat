import { createHash } from "crypto";

export type CanonicalJsonPrimitive = null | boolean | number | string;
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };
export type CanonicalJsonObject = { [key: string]: CanonicalJsonValue };

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export class CanonicalizationError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`${message} at ${path}`);
    this.name = "CanonicalizationError";
  }
}

function assertSafeKey(key: string, path: string): void {
  if (FORBIDDEN_KEYS.has(key)) {
    throw new CanonicalizationError(`Forbidden object key '${key}'`, path);
  }
}

export function assertCanonicalJson(
  value: unknown,
  path = "$",
  seen: WeakSet<object> = new WeakSet(),
): asserts value is CanonicalJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalizationError("Number must be finite", path);
    }
    if (Object.is(value, -0)) {
      throw new CanonicalizationError("Negative zero is not canonical", path);
    }
    return;
  }

  if (typeof value !== "object") {
    throw new CanonicalizationError(
      `Unsupported value type '${typeof value}'`,
      path,
    );
  }

  if (seen.has(value)) {
    throw new CanonicalizationError("Cyclic value is not canonical", path);
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          throw new CanonicalizationError(
            "Sparse arrays are not canonical",
            path,
          );
        }
        assertCanonicalJson(value[index], `${path}[${index}]`, seen);
      }
      return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CanonicalizationError("Only plain objects are canonical", path);
    }

    const keys = Reflect.ownKeys(value);
    for (const key of keys) {
      if (typeof key !== "string") {
        throw new CanonicalizationError("Symbol keys are not canonical", path);
      }
      assertSafeKey(key, `${path}.${key}`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new CanonicalizationError(
          "Accessors and non-enumerable values are not canonical",
          `${path}.${key}`,
        );
      }
      assertCanonicalJson(descriptor.value, `${path}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function serializeCanonical(value: CanonicalJsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeCanonical(entry)).join(",")}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${serializeCanonical(
          value[key] as CanonicalJsonValue,
        )}`,
    );
  return `{${entries.join(",")}}`;
}

export function canonicalJson(value: unknown): string {
  assertCanonicalJson(value);
  return serializeCanonical(value);
}

export function canonicalBytes(value: unknown): Uint8Array {
  return Buffer.from(canonicalJson(value), "utf8");
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256").update(canonicalBytes(value)).digest("hex");
}

export function cloneCanonical<T extends CanonicalJsonValue>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T;
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
