import {
  INT32_MAX,
  INT32_MIN,
  booleanValue,
  exhaustiveValues,
  int32Value,
  oneOf,
  optional,
  required,
  stringArray,
  stringMap,
  stringValue,
  validateStrictObject,
} from './strict-object';

const RULES = {
  name: required(stringValue),
  note: optional(stringValue),
  enabled: optional(booleanValue),
  count: optional(int32Value),
  status: optional(oneOf(['open', 'closed'])),
  tags: optional(stringArray),
  metadata: optional(stringMap),
};

type Body = {
  name: string;
  note?: string;
  enabled?: boolean;
  count?: number;
  status?: 'open' | 'closed';
  tags?: string[];
  metadata?: Record<string, string>;
};

const validate = (body: unknown) => validateStrictObject<Body>(body, RULES);

function errorsOf(body: unknown) {
  const result = validate(body);
  if (result.ok) {
    throw new Error('expected validation to fail');
  }
  return result.errors;
}

describe('validateStrictObject', () => {
  it('accepts a valid body and returns only present fields', () => {
    const result = validate({ name: 'Alpha', count: 3 });

    expect(result).toEqual({ ok: true, value: { name: 'Alpha', count: 3 } });
    if (result.ok) {
      expect(Object.keys(result.value)).toEqual(['name', 'count']);
    }
  });

  it('keeps omitted optional fields omitted', () => {
    const result = validate({ name: 'Alpha' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.prototype.hasOwnProperty.call(result.value, 'note')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result.value, 'metadata')).toBe(false);
    }
  });

  it('preserves zero, false and empty string unchanged', () => {
    const result = validate({ name: '', enabled: false, count: 0 });

    expect(result).toEqual({ ok: true, value: { name: '', enabled: false, count: 0 } });
  });

  it('does not trim or coerce values', () => {
    const result = validate({ name: '  padded  ' });
    expect(result.ok && result.value.name).toBe('  padded  ');

    expect(errorsOf({ name: 'A', count: '3' })).toEqual([
      { field: 'count', message: 'must be a number' },
    ]);
    expect(errorsOf({ name: 'A', enabled: 'true' })).toEqual([
      { field: 'enabled', message: 'must be a boolean' },
    ]);
  });

  it('requires required fields and rejects wrong types', () => {
    expect(errorsOf({})).toEqual([{ field: 'name', message: 'is required' }]);
    expect(errorsOf({ name: 42 })).toEqual([{ field: 'name', message: 'must be a string' }]);
  });

  it('rejects null for required and optional fields', () => {
    expect(errorsOf({ name: null, note: null, count: null })).toEqual([
      { field: 'name', message: 'must not be null' },
      { field: 'note', message: 'must not be null' },
      { field: 'count', message: 'must not be null' },
    ]);
  });

  it('enforces exact enum membership', () => {
    expect(validate({ name: 'A', status: 'open' }).ok).toBe(true);
    expect(errorsOf({ name: 'A', status: 'OPEN' })).toEqual([
      { field: 'status', message: 'must be one of: open, closed' },
    ]);
  });

  it.each([
    [1.5, 'must be an integer'],
    [Number.NaN, 'must be a finite number'],
    [Number.POSITIVE_INFINITY, 'must be a finite number'],
    [INT32_MAX + 1, 'must be within the 32-bit signed integer range'],
    [INT32_MIN - 1, 'must be within the 32-bit signed integer range'],
  ])('rejects non-integer or out-of-range number %p', (count, message) => {
    expect(errorsOf({ name: 'A', count })).toEqual([{ field: 'count', message }]);
  });

  it('accepts the 32-bit integer bounds and negative integers', () => {
    expect(validate({ name: 'A', count: INT32_MAX }).ok).toBe(true);
    expect(validate({ name: 'A', count: INT32_MIN }).ok).toBe(true);
    expect(validate({ name: 'A', count: -1 }).ok).toBe(true);
  });

  it.each([null, undefined, 'text', 7, true, [], [{ name: 'A' }]])(
    'rejects non-object body %p',
    (body) => {
      expect(errorsOf(body)).toEqual([{ field: '(body)', message: 'must be a JSON object' }]);
    }
  );

  it('rejects unknown keys, including body-supplied IDs', () => {
    expect(errorsOf({ name: 'A', id: 'x' })).toEqual([
      { field: '(body)', message: 'contains 1 field that is not allowed' },
    ]);
    expect(errorsOf({ name: 'A', id: 'x', submissionId: 'y' })).toEqual([
      { field: '(body)', message: 'contains 2 fields that are not allowed' },
    ]);
  });

  it('rejects JSON-parsed prototype-related keys without modifying prototypes', () => {
    const body = JSON.parse(
      '{"name":"A","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
    );

    expect(errorsOf(body)).toEqual([
      { field: '(body)', message: 'contains 2 fields that are not allowed' },
    ]);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });

  it('does not read inherited properties as fields', () => {
    const body = Object.create({ name: 'inherited' }) as object;
    expect(errorsOf(body)).toEqual([{ field: '(body)', message: 'must be a JSON object' }]);
  });

  it('collects every error instead of stopping at the first', () => {
    expect(errorsOf({ extra: 1, name: 5, count: 1.2, status: 'x' })).toEqual([
      { field: '(body)', message: 'contains 1 field that is not allowed' },
      { field: 'name', message: 'must be a string' },
      { field: 'count', message: 'must be an integer' },
      { field: 'status', message: 'must be one of: open, closed' },
    ]);
  });

  it('never echoes submitted values or submitted key names in errors', () => {
    const secret = 'sk_synthetic_secret_value_123';
    const errors = errorsOf({
      name: { secret },
      note: 99,
      status: secret,
      tags: [secret, 1],
      metadata: { [secret]: 5 },
      [secret]: secret,
    });

    expect(JSON.stringify(errors)).not.toContain(secret);
    expect(errors).toContainEqual({ field: '(body)', message: 'contains 1 field that is not allowed' });
    expect(errors).toContainEqual({ field: 'metadata', message: 'entry 1 must be a string' });
  });

  describe('stringArray', () => {
    it('accepts and copies string arrays, including empty arrays', () => {
      const tags = ['a', ''];
      const result = validate({ name: 'A', tags });

      expect(result.ok && result.value.tags).toEqual(['a', '']);
      expect(result.ok && result.value.tags).not.toBe(tags);
      expect(validate({ name: 'A', tags: [] }).ok).toBe(true);
    });

    it('reports non-string items by index', () => {
      expect(errorsOf({ name: 'A', tags: ['a', 2, null] })).toEqual([
        { field: 'tags[1]', message: 'must be a string' },
        { field: 'tags[2]', message: 'must not be null' },
      ]);
      expect(errorsOf({ name: 'A', tags: 'a' })).toEqual([
        { field: 'tags', message: 'must be an array of strings' },
      ]);
    });
  });

  describe('stringMap', () => {
    it('accepts caller-defined keys without applying the outer field list', () => {
      const result = validate({ name: 'A', metadata: { name: 'x', id: 'y', anyKey: '' } });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect({ ...result.value.metadata }).toEqual({ name: 'x', id: 'y', anyKey: '' });
      }
    });

    it('rejects non-string values and non-object maps', () => {
      expect(errorsOf({ name: 'A', metadata: { a: 'ok', b: 1, c: null } })).toEqual([
        { field: 'metadata', message: 'entry 2 must be a string' },
        { field: 'metadata', message: 'entry 3 must not be null' },
      ]);
      expect(errorsOf({ name: 'A', metadata: ['x'] })).toEqual([
        { field: 'metadata', message: 'must be an object with string values' },
      ]);
    });

    it('copies a JSON-parsed __proto__ key as an own property without changing prototypes', () => {
      const body = JSON.parse('{"name":"A","metadata":{"__proto__":"x","source":"y"}}');
      const result = validate(body);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const metadata = result.value.metadata as Record<string, string>;
        expect(Object.getPrototypeOf(metadata)).toBeNull();
        expect(Object.keys(metadata)).toEqual(['__proto__', 'source']);
        expect(Object.getOwnPropertyDescriptor(metadata, '__proto__')?.value).toBe('x');
      }
      expect(Object.getPrototypeOf({})).toBe(Object.prototype);
    });
  });

  it('rejects accessor properties without invoking them', () => {
    const getter = jest.fn(() => 'value');
    const body = { name: 'A' };
    Object.defineProperty(body, 'note', { get: getter, enumerable: true });

    expect(errorsOf(body)).toEqual([{ field: 'note', message: 'must be a plain data property' }]);
    expect(getter).not.toHaveBeenCalled();
  });
});

describe('exhaustiveValues', () => {
  it('returns the listed values unchanged', () => {
    type Status = 'open' | 'closed';
    const values = exhaustiveValues<Status>()(['open', 'closed']);
    expect(values).toEqual(['open', 'closed']);
  });
});
