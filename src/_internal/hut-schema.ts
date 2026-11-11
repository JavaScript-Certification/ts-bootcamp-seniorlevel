// A tiny schema library, in the spirit of Zod or Valibot. You do not need to modify this file.
// A Schema<T> checks an unknown value at runtime and, when it fits, hands it back typed as T.

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] }

export type Schema<T> = {
  /** checks the value; `path` names it in the error messages */
  parse: (value: unknown, path?: string) => Result<T>
}

function kindOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  return typeof value
}

function fail(message: string): { ok: false; errors: string[] } {
  return { ok: false, errors: [message] }
}

export function string(): Schema<string> {
  return {
    parse: (value, path = 'value') =>
      typeof value === 'string' ? { ok: true, value } : fail(`${path}: expected a string, got ${kindOf(value)}`),
  }
}

export function number(): Schema<number> {
  return {
    parse: (value, path = 'value') =>
      typeof value === 'number' && Number.isFinite(value)
        ? { ok: true, value }
        : fail(`${path}: expected a number, got ${kindOf(value)}`),
  }
}

/** One schema per key. TypeScript infers T from the shape: object({ name: string() }) is a Schema<{ name: string }> */
export function object<T>(shape: { [K in keyof T]: Schema<T[K]> }): Schema<T> {
  return {
    parse(value, path = 'booking') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return fail(`${path}: expected an object, got ${kindOf(value)}`)
      }
      const errors: string[] = []
      const parsed: Partial<T> = {}
      for (const key in shape) {
        const result = shape[key].parse(Reflect.get(value, key), key)
        if (result.ok) parsed[key] = result.value
        else errors.push(...result.errors)
      }
      if (errors.length > 0) return { ok: false, errors }
      // every key of the shape was checked just above: the library vouches for it, once, here
      return { ok: true, value: parsed as T }
    },
  }
}
