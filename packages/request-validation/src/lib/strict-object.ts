/**
 * Small, dependency-free runtime checks for JSON request bodies.
 *
 * - Only fields listed in the rules are accepted; any other own key is rejected.
 * - Values are never coerced, trimmed or defaulted.
 * - Omitted optional fields stay omitted in the returned value.
 * - Error messages never include submitted values.
 *
 * This is intentionally not a general-purpose schema language.
 */

export interface RequestValidationError {
  field: string;
  message: string;
}

export type RequestValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: RequestValidationError[] };

/** Checks a present value. Returns errors only; never throws. */
export type ValueCheck = (value: unknown, field: string) => RequestValidationError[];

export interface ValueRule {
  readonly check: ValueCheck;
  /** Copies a value that passed `check` into a fresh, safely constructed value. */
  readonly copy?: (value: unknown) => unknown;
}

export interface FieldRule extends ValueRule {
  readonly required: boolean;
}

export type ObjectRules = Readonly<Record<string, FieldRule>>;

export const INT32_MIN = -2147483648;
export const INT32_MAX = 2147483647;

/** Request-supplied key names are never echoed: they can carry tokens or other sensitive text. */
export const BODY_FIELD = '(body)';

function typeMessage(value: unknown, expected: string): string {
  return value === null ? 'must not be null' : `must be ${expected}`;
}

function typeError(value: unknown, field: string, expected: string): RequestValidationError[] {
  return [{ field, message: typeMessage(value, expected) }];
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Reads an own data property without consulting the prototype chain or invoking accessors. */
function ownData(
  target: object,
  key: string
): { present: false } | { present: true; isData: boolean; value: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (!descriptor) {
    return { present: false };
  }
  return 'value' in descriptor
    ? { present: true, isData: true, value: descriptor.value }
    : { present: true, isData: false, value: undefined };
}

export function required(rule: ValueRule): FieldRule {
  return { ...rule, required: true };
}

export function optional(rule: ValueRule): FieldRule {
  return { ...rule, required: false };
}

export const stringValue: ValueRule = {
  check: (value, field) => (typeof value === 'string' ? [] : typeError(value, field, 'a string')),
};

export const booleanValue: ValueRule = {
  check: (value, field) => (typeof value === 'boolean' ? [] : typeError(value, field, 'a boolean')),
};

/** Finite integer representable by a PostgreSQL `integer` column. */
export const int32Value: ValueRule = {
  check: (value, field) => {
    if (typeof value !== 'number') {
      return typeError(value, field, 'a number');
    }
    if (!Number.isFinite(value)) {
      return [{ field, message: 'must be a finite number' }];
    }
    if (!Number.isInteger(value)) {
      return [{ field, message: 'must be an integer' }];
    }
    if (value < INT32_MIN || value > INT32_MAX) {
      return [{ field, message: 'must be within the 32-bit signed integer range' }];
    }
    return [];
  },
};

/** Exact membership in a fixed list of string values. */
export function oneOf(allowed: readonly string[]): ValueRule {
  const message = `must be one of: ${allowed.join(', ')}`;
  return {
    check: (value, field) => {
      if (typeof value !== 'string') {
        return typeError(value, field, 'a string');
      }
      return allowed.includes(value) ? [] : [{ field, message }];
    },
  };
}

export const stringArray: ValueRule = {
  check: (value, field) => {
    if (!Array.isArray(value)) {
      return typeError(value, field, 'an array of strings');
    }
    const errors: RequestValidationError[] = [];
    for (let index = 0; index < value.length; index++) {
      const item = ownData(value, String(index));
      if (!item.present || !item.isData || typeof item.value !== 'string') {
        errors.push(...typeError(item.present ? item.value : undefined, `${field}[${index}]`, 'a string'));
      }
    }
    return errors;
  },
  copy: (value) => Array.from(value as string[]),
};

/**
 * A string-to-string map. Keys are caller-defined, so the outer field list is NOT applied to them.
 * The copy has a null prototype and is populated with defineProperty, so keys such as
 * `__proto__` become ordinary own properties and no prototype is ever modified.
 */
export const stringMap: ValueRule = {
  check: (value, field) => {
    if (!isPlainObject(value)) {
      return typeError(value, field, 'an object with string values');
    }
    // Entries are identified by 1-based position, never by their (caller-supplied) key.
    const errors: RequestValidationError[] = [];
    Reflect.ownKeys(value).forEach((key, index) => {
      const entry = `entry ${index + 1}`;
      if (typeof key !== 'string') {
        errors.push({ field, message: `${entry} must have a string key` });
        return;
      }
      const data = ownData(value, key);
      if (!data.present || !data.isData || typeof data.value !== 'string') {
        errors.push({ field, message: `${entry} ${typeMessage(data.present ? data.value : undefined, 'a string')}` });
      }
    });
    return errors;
  },
  copy: (value) => {
    const source = value as Record<string, unknown>;
    const result = Object.create(null) as Record<string, string>;
    for (const key of Object.keys(source)) {
      const entry = ownData(source, key);
      Object.defineProperty(result, key, {
        value: entry.present ? entry.value : undefined,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return result;
  },
};

/**
 * Validates a request body against a fixed set of field rules and returns an explicit projection
 * containing only the listed fields that were present.
 */
export function validateStrictObject<T>(
  body: unknown,
  rules: ObjectRules
): RequestValidationResult<T> {
  if (!isPlainObject(body)) {
    return { ok: false, errors: [{ field: BODY_FIELD, message: 'must be a JSON object' }] };
  }

  const errors: RequestValidationError[] = [];

  const unknownCount = Reflect.ownKeys(body).filter(
    (key) => typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(rules, key)
  ).length;
  if (unknownCount > 0) {
    errors.push({
      field: BODY_FIELD,
      message:
        unknownCount === 1
          ? 'contains 1 field that is not allowed'
          : `contains ${unknownCount} fields that are not allowed`,
    });
  }

  const value: Record<string, unknown> = {};
  for (const name of Object.keys(rules)) {
    const rule = rules[name];
    const field = ownData(body, name);
    if (!field.present) {
      if (rule.required) {
        errors.push({ field: name, message: 'is required' });
      }
      continue;
    }
    if (!field.isData) {
      errors.push({ field: name, message: 'must be a plain data property' });
      continue;
    }
    const fieldErrors = rule.check(field.value, name);
    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors);
      continue;
    }
    // `name` comes from the trusted rule set, never from the request.
    value[name] = rule.copy ? rule.copy(field.value) : field.value;
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: value as T };
}

/**
 * Compile-time helper: returns `values` unchanged, but fails type-checking unless every member of
 * the string union `T` is listed.
 */
export function exhaustiveValues<T extends string>() {
  return <const A extends readonly T[]>(
    values: A & (Exclude<T, A[number]> extends never ? unknown : { missingValues: Exclude<T, A[number]> })
  ): A => values;
}
