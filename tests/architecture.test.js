/**
 * Enforces the four-layer architecture by inspecting require() calls:
 *   api -> services -> data -> models   (models may be used by every layer)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src');

// Which top-level src folders each layer is allowed to require.
const ALLOWED = {
  api: ['api', 'services', 'models', 'config'],
  services: ['services', 'data', 'models', 'config', 'templates'],
  data: ['data', 'models', 'config'],
  models: ['models'],
  templates: ['templates'],
  workers: ['workers', 'services', 'config'],
};

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : full.endsWith('.js') ? [full] : [];
  });
}

function internalRequires(file) {
  const source = fs.readFileSync(file, 'utf8');
  const matches = [...source.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)];
  return matches.map((match) => {
    const target = path.relative(SRC, path.resolve(path.dirname(file), match[1]));
    return target.split(path.sep)[0].replace(/\.js$/, '');
  });
}

for (const [layer, allowed] of Object.entries(ALLOWED)) {
  test(`${layer} layer only depends on: ${allowed.join(', ')}`, () => {
    for (const file of listFiles(path.join(SRC, layer))) {
      for (const target of internalRequires(file)) {
        assert.ok(
          allowed.includes(target),
          `${path.relative(SRC, file)} must not depend on "${target}"`,
        );
      }
    }
  });
}

test('SQL only appears in the data layer', () => {
  const sqlPattern = /\b(SELECT\s+[\w*]|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/;
  for (const layer of ['api', 'services', 'models', 'workers', 'templates']) {
    for (const file of listFiles(path.join(SRC, layer))) {
      assert.ok(!sqlPattern.test(fs.readFileSync(file, 'utf8')), `SQL found in ${path.relative(SRC, file)}`);
    }
  }
});
