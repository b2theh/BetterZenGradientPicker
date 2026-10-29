const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../BetterZenGradientPicker.uc.js`, 'utf8');
const PREFIX = 'zen.theme.active-tab-color';
function section(start, end) { return source.slice(source.indexOf(start), source.indexOf(end)); }
const implementation = [
  section('  class nsZenPickerFeature {', '  // Modifies opacity'),
  section('  const TAB_ACCENT_PREF', '  // Quick reset for grain texture'),
  'globalThis.Feature = nsZenPickerTabAccent; globalThis.normalize = normalizeTabAccent; globalThis.textColor = tabAccentTextColor;',
].join('\n');
function prefs(initial = {}) {
  const values = new Map(Object.entries(initial));
  const observers = [];
  return {
    getBoolPref: (key, fallback) => values.get(key) ?? fallback,
    getIntPref: (key, fallback) => values.get(key) ?? fallback,
    getStringPref: (key, fallback) => values.get(key) ?? fallback,
    addObserver: (prefix, observer) => observers.push({ prefix, observer }),
    removeObserver(prefix, observer) {
      const index = observers.findIndex(item => item.prefix === prefix && item.observer === observer);
      if (index >= 0) observers.splice(index, 1);
    },
    setStringPref(key, value) {
      values.set(key, value);
      for (const { prefix, observer } of [...observers]) {
        if (key.startsWith(prefix)) observer.observe(null, 'nsPref:changed', key);
      }
    },
  };
}
class Element extends EventTarget {
  constructor(id = '') {
    super(); this.id = id; this.children = []; this.attributes = new Map(); this.properties = new Map();
    this.style = {
      setProperty: (key, value) => this.properties.set(key, value),
      removeProperty: key => this.properties.delete(key),
    };
  }
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
  append(...children) { this.children.push(...children); }
  remove() { this.removed = true; }
}
function browser({ shared = prefs(), systemDark = false, privateWindow = false } = {}) {
  const root = new Element(); const controls = new Element(); const panel = new Element();
  const media = new EventTarget(); media.matches = systemDark;
  const context = vm.createContext({
    AbortController, EventTarget, Services: { prefs: shared },
    window: { matchMedia: () => media },
    ChromeUtils: { importESModule: () => ({ PrivateBrowsingUtils: { isWindowPrivate: () => privateWindow } }) },
    document: {
      documentElement: root, getElementById: () => controls,
      createXULElement: () => new Element(), createElementNS: () => new Element(),
    },
  });
  vm.runInContext(implementation, context);
  const feature = new context.Feature({}); feature.init({ panel });
  const row = controls.children[0]; const [label, input] = row.children;
  return { root, row, label, input, shared, feature, normalize: context.normalize, textColor: context.textColor,
    color: () => root.properties.get('--bzgp-active-tab-color'),
    text: () => root.properties.get('--bzgp-active-tab-text'),
    set: (key, value) => shared.setStringPref(key, value),
    dark(value) { media.matches = value; media.dispatchEvent(new Event('change')); },
    select(value) { input.dispatchEvent(new Event('click')); input.value = value; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('change')); },
  };
}
function enabled(options = {}) {
  return browser({ shared: prefs({ [PREFIX + '.enabled']: true, 'zen.view.window.scheme': 1 }), ...options });
}

test('disabled by default leaves all existing accent and background properties untouched', () => {
  const b = browser();
  assert.equal(b.row.hidden, true);
  assert.equal(b.root.attributes.has('bzgp-custom-tab-accent'), false);
  assert.equal(b.root.properties.size, 0);
});

test('HEX validation expands shorthand and rejects CSS functions, alpha, and injected declarations', () => {
  const b = enabled();
  assert.equal(b.normalize(' #ABC '), '#aabbcc');
  assert.equal(b.normalize('#00FF88'), '#00ff88');
  for (const value of ['', 'blue', '#abcd', '#12345678', 'rgb(1,2,3)', '#123456;display:none', null]) {
    assert.equal(b.normalize(value), null);
  }
});

test('light and dark colors switch independently of the gradient-pair feature', () => {
  const b = enabled();
  b.select('#112233');
  b.set('zen.view.window.scheme', 0); b.select('#fedcba');
  assert.equal(b.color(), '#fedcba');
  assert.match(b.label.textContent, /Dark/);
  b.set('zen.view.window.scheme', 1);
  assert.equal(b.color(), '#112233');
  assert.match(b.label.textContent, /Light/);
  assert.equal(b.shared.getBoolPref('zen.theme.separate-color-schemes', false), false);
});

test('auto appearance follows system changes and explicit mode takes priority', () => {
  const b = enabled();
  b.set(PREFIX + '.light', '#112233'); b.set(PREFIX + '.dark', '#fedcba');
  b.set('zen.view.window.scheme', 2);
  assert.equal(b.color(), '#112233');
  b.dark(true); assert.equal(b.color(), '#fedcba');
  b.set('zen.view.window.scheme', 1);
  assert.equal(b.color(), '#112233');
});

test('native dialog edits the mode in which it was opened, even if appearance changes', () => {
  const b = enabled();
  b.input.dispatchEvent(new Event('click'));
  b.set('zen.view.window.scheme', 0);
  b.input.value = '#123456'; b.input.dispatchEvent(new Event('input')); b.input.dispatchEvent(new Event('change'));
  assert.equal(b.shared.getStringPref(PREFIX + '.light'), '#123456');
  assert.equal(b.color(), '#a78bfa');
});

test('invalid color falls back to native styling, and disabling removes only owned variables', () => {
  const b = enabled();
  b.root.style.setProperty('--zen-primary-color', '#abcdef');
  b.set(PREFIX + '.light', 'broken');
  assert.equal(b.root.attributes.has('bzgp-custom-tab-accent'), false);
  b.set(PREFIX + '.light', '#abcdef');
  assert.equal(b.color(), '#abcdef');
  b.set(PREFIX + '.enabled', false);
  assert.equal(b.color(), undefined);
  assert.equal(b.row.hidden, true);
  assert.equal(b.root.properties.get('--zen-primary-color'), '#abcdef');
});

test('chooses black or white with WCAG AA contrast for every grayscale value and saturated colors', () => {
  const b = enabled();
  function luminance(hex) {
    const [r, g, blue] = [1, 3, 5].map(i => {
      const value = parseInt(hex.slice(i, i + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return r * 0.2126 + g * 0.7152 + blue * 0.0722;
  }
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#8b5cf6', '#a78bfa', '#000000', '#ffffff'];
  for (let i = 0; i <= 255; i++) colors.push('#' + i.toString(16).padStart(2, '0').repeat(3));
  for (const color of colors) {
    const foreground = b.textColor(color);
    const l1 = luminance(color); const l2 = luminance(foreground);
    assert.ok((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) >= 4.5, color);
  }
});

test('changes reach other windows and colors survive a restart', () => {
  const first = enabled(); const second = browser({ shared: first.shared });
  first.select('#123456');
  assert.equal(second.color(), '#123456');
  const restarted = browser({ shared: first.shared });
  assert.equal(restarted.color(), '#123456');
});

test('private windows follow Zen dark appearance; uninit cleans UI, styles and observers', () => {
  const b = enabled({ privateWindow: true });
  assert.equal(b.color(), '#a78bfa');
  b.feature.uninit();
  assert.equal(b.row.removed, true);
  assert.equal(b.color(), undefined);
  b.set(PREFIX + '.dark', '#ffffff'); b.dark(true);
  assert.equal(b.color(), undefined);
});
