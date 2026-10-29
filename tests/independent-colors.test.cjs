const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/../BetterZenGradientPicker.uc.js`, 'utf8');
function section(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end));
}
const PREF = 'zen.theme.independent-color-points';
const clone = value => JSON.parse(JSON.stringify(value));
function setup(enabled = true) {
  let independent = enabled;
  let nativeCalculations = 0;
  const observers = new Set();
  const attributes = new Map();
  const button = { disabled: false };
  const panel = new EventTarget();
  panel.setAttribute = (key, value) => attributes.set(key, value);
  panel.removeAttribute = key => attributes.delete(key);
  const workspace = { theme: { gradientColors: [{ algorithm: 'complementary' }, { algorithm: 'complementary' }, { algorithm: 'complementary' }] } };
  const picker = {
    panel,
    dots: [0, 1, 2].map(ID => ({ ID, type: 'explicit-lightness',
      position: { x: 40 + ID * 60, y: 70 + ID * 30 } })),
    useAlgo: 'complementary',
    calculateCompliments(dots) { nativeCalculations++; return dots; },
    handleColorPositions() {}, getGradient() {}, onDotMouseMove() {}, onDotMouseUp() {}, onWorkspaceChange() {},
    themedColors: colors => colors,
  };
  const context = vm.createContext({
    EventTarget, AbortController, setTimeout: () => 0, cancelAnimationFrame() {},
    document: { getElementById: () => button },
    Services: { prefs: {
      getBoolPref: key => key === PREF && independent,
      addObserver: (key, observer) => observers.add(observer),
      removeObserver: (key, observer) => observers.delete(observer),
    } },
    HOOK_PRIORITY: { HARMONY: 10 }, INDEPENDENT_COLORS_PREF: PREF, MAX_DOTS: 6,
  });
  vm.runInContext([
    section('  const EXTENDED_HARMONIES', '  // Pre-calculated paths'),
    section('  class nsZenPickerHooks {', '  // Handles saving/loading'),
    section('  class nsZenPickerFeature {', '  // Modifies opacity'),
    section('  class nsZenPickerHarmony ', '  // Adds a rotation dial'),
    'globalThis.Harmony = nsZenPickerHarmony; globalThis.Hooks = nsZenPickerHooks;',
  ].join('\n'), context);
  const events = new EventTarget();
  const mods = { hooks: new context.Hooks(), events, getWorkspace: () => workspace,
    getGradientSize: () => ({ width: 380, height: 380 }), renderingWorkspaceId: null };
  const feature = new context.Harmony(mods);
  feature.init(picker);
  return { picker, workspace, feature, attributes, button, events,
    get nativeCalculations() { return nativeCalculations; },
    toggle(value) {
      independent = value;
      for (const observer of observers) observer.observe(null, 'nsPref:changed', PREF);
    },
    restore(algorithm) {
      const event = new Event('harmony-mode');
      event.detail = { algorithm }; events.dispatchEvent(event);
    },
  };
}

test('enabling independent points preserves existing coordinates and disables harmony cycling', () => {
  const b = setup(false);
  const before = clone(b.picker.dots);
  b.toggle(true);
  assert.deepEqual(b.picker.dots, before);
  assert.equal(b.picker.useAlgo, 'floating');
  assert.equal(b.attributes.get('zen-harmony-mode'), 'floating');
  assert.equal(b.button.disabled, true);
});

test('dragging each point leaves all other positions unchanged', () => {
  for (const draggedID of [0, 1, 2]) {
    const b = setup();
    b.picker.dots[draggedID].position = { x: 123, y: 245 };
    const before = clone(b.picker.dots);
    const result = b.picker.calculateCompliments(b.picker.dots, 'update', 'complementary');
    assert.deepEqual(clone(result), before);
    assert.equal(b.picker.useAlgo, 'floating');
    assert.equal(b.nativeCalculations, 0);
  }
});

test('adding a point preserves all existing positions and palette types', () => {
  const b = setup();
  const before = clone(b.picker.dots);
  const result = b.picker.calculateCompliments(b.picker.dots, 'add', 'triadic');
  assert.deepEqual(clone(result.slice(0, 3)), before);
  assert.deepEqual(clone(result[3]), { ID: 3, type: 'explicit-lightness', position: { x: 190, y: 190 } });
});

test('removing a point does not rearrange the survivors', () => {
  const b = setup();
  b.picker.dots.pop(); // Native Zen removes it before calculating the new harmony.
  const before = clone(b.picker.dots);
  assert.deepEqual(clone(b.picker.calculateCompliments(b.picker.dots, 'remove')), before);
});

test('adding from zero points works and the six-point maximum is respected', () => {
  const b = setup();
  assert.equal(b.picker.calculateCompliments([], 'add').length, 1);
  const dots = Array.from({ length: 6 }, (_, ID) => ({ ID, position: { x: 10, y: 20 } }));
  assert.equal(b.picker.calculateCompliments(dots, 'add').length, 6);
});

test('favorites and restored light/dark themes cannot re-enable linked harmonies', () => {
  const b = setup();
  for (const algorithm of ['complementary', 'triadic', 'analogous']) {
    b.restore(algorithm);
    b.picker.getGradient([{ algorithm }, { algorithm }]);
    assert.equal(b.picker.useAlgo, 'floating');
    const before = clone(b.picker.dots);
    assert.deepEqual(clone(b.picker.calculateCompliments(b.picker.dots, 'harmony', algorithm)), before);
    b.picker.onWorkspaceChange(b.workspace);
    assert.equal(b.button.disabled, true);
  }
});

test('turning the setting off restores harmony selection without moving colors', () => {
  const b = setup();
  const before = clone(b.picker.dots);
  b.toggle(false);
  assert.deepEqual(b.picker.dots, before);
  assert.equal(b.button.disabled, false);
  assert.equal(b.picker.useAlgo, 'complementary');
  b.picker.calculateCompliments(b.picker.dots, 'update', 'complementary');
  assert.equal(b.nativeCalculations, 1);
});

test('disabled preference retains normal linked behavior', () => {
  const b = setup(false);
  b.picker.calculateCompliments(b.picker.dots, 'update', 'complementary');
  assert.equal(b.nativeCalculations, 1);
  assert.equal(b.attributes.has('zen-harmony-mode'), false);
});
