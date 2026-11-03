/**
 * A small, dependency-free schema validator.
 *
 * A schema is a plain object that describes each field:
 *
 *   {
 *     email:    { type: 'string', required: true, format: 'email', maxLength: 255 },
 *     quantity: { type: 'integer', min: 1, max: 99, default: 1 },
 *     sort:     { type: 'string', enum: ['name', 'price'] },
 *     items:    { type: 'array', minItems: 1, items: { type: 'object', schema: {...} } },
 *   }
 *
 * validate(schema, input) returns { value, errors }:
 *   - value  : a cleaned copy of the input (trimmed, converted, defaults applied)
 *   - errors : [{ field, message }] — empty when the input is valid
 *
 * Unknown fields are dropped so callers only ever see fields they declared.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function validateField(rule, rawValue, field, errors) {
  let value = rawValue;

  if (isEmpty(value)) {
    if (rule.required) {
      errors.push({ field, message: `${rule.label || field} is required` });
    }
    return rule.default;
  }

  switch (rule.type) {
    case 'string': {
      if (typeof value !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
        return undefined;
      }
      value = value.trim();
      if (rule.lowercase) value = value.toLowerCase();
      if (rule.required && value === '') {
        errors.push({ field, message: `${rule.label || field} is required` });
        return undefined;
      }
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({ field, message: `${field} must be at least ${rule.minLength} characters` });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rule.maxLength} characters` });
      }
      if (rule.format === 'email' && !EMAIL_PATTERN.test(value)) {
        errors.push({ field, message: `${field} must be a valid email address` });
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rule.enum.join(', ')}` });
      }
      return value;
    }

    case 'integer':
    case 'number': {
      // Query-string values arrive as strings, so convert numeric strings.
      if (typeof value === 'string' && value.trim() !== '') value = Number(value);
      const valid =
        typeof value === 'number' &&
        Number.isFinite(value) &&
        (rule.type === 'number' || Number.isInteger(value));
      if (!valid) {
        errors.push({ field, message: `${field} must be ${rule.type === 'integer' ? 'an integer' : 'a number'}` });
        return undefined;
      }
      if (rule.min !== undefined && value < rule.min) {
        errors.push({ field, message: `${field} must be at least ${rule.min}` });
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({ field, message: `${field} must be at most ${rule.max}` });
      }
      return value;
    }

    case 'boolean': {
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (typeof value !== 'boolean') {
        errors.push({ field, message: `${field} must be true or false` });
        return undefined;
      }
      return value;
    }

    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({ field, message: `${field} must be an object` });
        return undefined;
      }
      return validateObject(rule.schema, value, errors, `${field}.`);
    }

    case 'array': {
      if (!Array.isArray(value)) {
        errors.push({ field, message: `${field} must be an array` });
        return undefined;
      }
      if (rule.minItems !== undefined && value.length < rule.minItems) {
        errors.push({ field, message: `${field} must contain at least ${rule.minItems} item(s)` });
      }
      if (rule.maxItems !== undefined && value.length > rule.maxItems) {
        errors.push({ field, message: `${field} must contain at most ${rule.maxItems} items` });
      }
      return value.map((item, index) => validateField(rule.items, item, `${field}[${index}]`, errors));
    }

    default:
      throw new Error(`Unknown validation type "${rule.type}" for field ${field}`);
  }
}

function validateObject(schema, input, errors, prefix = '') {
  const source = input && typeof input === 'object' ? input : {};
  const result = {};
  for (const [key, rule] of Object.entries(schema)) {
    const value = validateField(rule, source[key], `${prefix}${key}`, errors);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function validate(schema, input) {
  const errors = [];
  const value = validateObject(schema, input, errors);
  return { value, errors };
}

module.exports = { validate, EMAIL_PATTERN };
