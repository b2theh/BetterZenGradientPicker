const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/../BetterZenGradientPicker.uc.js`, 'utf8');
function section(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end));
}
const implementation = [
  section('  class nsZenPickerHooks {', '  // Handles saving/loading'),
  section('  class nsZenPickerFeature {', '  // Modifies opacity'),
  section('  const SEPARATE_SCHEMES_PREF', '  // Adjusts the UI contrast'),
  'globalThis.Feature = nsZenPickerSeparateSchemes; globalThis.Hooks = nsZenPickerHooks;',
].join('\n');
const ENABLED = 'zen.theme.separate-color-schemes';
const SCHEME = 'zen.view.window.scheme';
const PREFIX = 'zen.theme.picker.color-schemes.';
const clone = value => JSON.parse(JSON.stringify(value));
const theme = (n) => ({
  type: 'gradient', opacity: n / 100, texture: n / 200, rotation: n,
  lightness: n, gradientColors: [{ c: [n, 20, 30], isPrimary: true,
    type: 'explicit-lightness', lightness: n, algorithm: 'floating', position: { x: n, y: 40 } }],
});

function preferenceService(initial = {}) {
  const data = new Map(Object.entries(initial));
  const observers = [];
  const prefs = {
    getBoolPref: (key, fallback) => data.get(key) ?? fallback,
    getIntPref: (key, fallback) => data.get(key) ?? fallback,
    getStringPref: (key, fallback) => data.get(key) ?? fallback,
    prefHasUserValue: key => data.has(key),
    addObserver: (prefix, observer) => observers.push({ prefix, observer }),
    removeObserver(prefix, observer) {
      const index = observers.findIndex(item => item.prefix === prefix && item.observer === observer);
      if (index !== -1) observers.splice(index, 1);
    },
    setStringPref(key, value) {
      if (data.get(key) === value) return;
      data.set(key, value);
      for (const { prefix, observer } of [...observers]) {
        if (key.startsWith(prefix)) observer.observe(null, 'nsPref:changed', key);
      }
    },
  };
  return { prefs, data, set: (key, value) => prefs.setStringPref(key, value) };
}

function browser({ shared = preferenceService(), workspaces = [{ uuid: 'a', theme: theme(80) }],
  systemDark = false, privateWindow = false } = {}) {
  const media = new EventTarget();
  media.matches = systemDark;
  let active = workspaces[0];
  let editing = null;
  let interacting = false;
  const tasks = new Map();
  const counts = { updates: 0, renders: 0, saves: 0, animationsCancelled: 0 };
  const manager = {
    getWorkspaces: () => workspaces,
    getActiveWorkspace: () => active,
    saveWorkspace: () => { counts.saves++; },
  };
  const picker = {
    dots: [],
    get workspaceBeingEdited() { return editing ?? active; },
    onWorkspaceChange(workspace, skipUpdate = false, preview = null) {
      counts.renders++;
      this.visible = clone(preview ?? workspace.theme);
      this.dots = clone(this.visible.gradientColors);
    },
    updateCurrentWorkspace(skipSave = true) {
      counts.updates++;
      const workspace = this.workspaceBeingEdited;
      workspace.theme = clone(this.editTheme ?? this.visible ?? workspace.theme);
      if (!skipSave) manager.saveWorkspace(workspace);
      this.onWorkspaceChange(workspace, skipSave, skipSave ? workspace.theme : null);
    },
    getGradientForWorkspace: workspace => clone(workspace.theme),
    invalidateGradientCache() {},
    shouldBeDarkMode: () => false,
  };
  const context = vm.createContext({
    EventTarget, AbortController,
    Services: { prefs: shared.prefs }, HOOK_PRIORITY: { CORE: -100, DYNAMIC_THEME: 50 },
    ChromeUtils: { importESModule: () => ({ PrivateBrowsingUtils: { isWindowPrivate: () => privateWindow } }) },
    window: { gZenWorkspaces: manager, matchMedia: () => media },
  });
  vm.runInContext(implementation, context);
  const mods = {
    hooks: new context.Hooks(), getWorkspace: () => editing ?? active,
    isInteracting: () => interacting,
    scheduler: { schedule: (key, fn) => tasks.set(key, fn), cancel: key => tasks.delete(key) },
    cancelGradientValueAnimation: () => { counts.animationsCancelled++; },
    emit() {},
  };
  const feature = new context.Feature(mods);
  feature.init(picker);
  return {
    picker, manager, counts, workspaces, shared, feature,
    record: (id = 'a') => JSON.parse(shared.data.get(PREFIX + encodeURIComponent(id))),
    set: shared.set,
    edit(value, commit = true) { picker.editTheme = value; picker.updateCurrentWorkspace(!commit); delete picker.editTheme; },
    activate(id) { active = workspaces.find(ws => ws.uuid === id); picker.onWorkspaceChange(active); },
    editWorkspace(id) { editing = workspaces.find(ws => ws.uuid === id); picker.onWorkspaceChange(editing); },
    drag(value) { interacting = value; },
    dark(value) { media.matches = value; media.dispatchEvent(new Event('change')); },
    flush() {
      const pending = [...tasks.values()]; tasks.clear();
      for (const fn of pending) fn();
    },
  };
}

function enabledBrowser(options = {}) {
  return browser({ shared: preferenceService({ [ENABLED]: true, [SCHEME]: 1 }), ...options });
}

test('disabled by default: no migration, rendering, or interception of edits', () => {
  const b = browser();
  assert.equal(b.counts.renders, 0);
  assert.equal(b.shared.data.size, 0);
  b.edit(theme(33));
  b.dark(true);
  assert.equal(b.counts.updates, 1);
  assert.equal(b.workspaces[0].theme.rotation, 33);
  assert.equal(b.shared.data.size, 0);
});

test('first enable seeds independent complete snapshots and retains native edits', () => {
  const b = browser();
  b.set(ENABLED, true);
  assert.deepEqual(b.record(), { version: 1, light: theme(80), dark: theme(80) });
  b.edit(theme(90), false); // Preview changes must survive a mode change before panel close.
  b.set(SCHEME, 0);
  assert.deepEqual(b.picker.visible, theme(80));
  b.edit(theme(15));
  b.set(SCHEME, 1);
  assert.deepEqual(b.picker.visible, theme(90));
  assert.deepEqual(b.record().dark, theme(15));
  assert.equal(b.picker.shouldBeDarkMode(), false);
  b.set(SCHEME, 0);
  assert.equal(b.picker.shouldBeDarkMode(), true);
});

test('native early mode-change update cannot save outgoing dots as the incoming theme', () => {
  const b = enabledBrowser();
  b.edit(theme(85));
  // Simulate Zen receiving the notification before our pref observer.
  b.shared.data.set(SCHEME, 0);
  b.picker.editTheme = theme(99);
  b.picker.updateCurrentWorkspace(false);
  assert.equal(b.counts.updates, 1); // only the preceding edit reached native code
  assert.deepEqual(b.record().dark, theme(80));
  assert.deepEqual(b.record().light, theme(85));
  assert.deepEqual(b.picker.visible, theme(80));
});

test('automatic appearance follows the system; explicit appearance takes priority', () => {
  const b = enabledBrowser();
  b.edit(theme(92));
  b.set(SCHEME, 0); b.edit(theme(12));
  b.set(SCHEME, 2);
  assert.equal(b.picker.visible.rotation, 92);
  b.dark(true); assert.equal(b.picker.visible.rotation, 12);
  b.set(SCHEME, 1);
  b.dark(false); b.dark(true);
  assert.equal(b.picker.visible.rotation, 92);
});

test('all workspaces switch, including an inactive workspace being edited', () => {
  const b = enabledBrowser({ workspaces: [{ uuid: 'a', theme: theme(80) }, { uuid: 'b', theme: theme(60) }] });
  b.activate('b'); b.edit(theme(65));
  b.activate('a'); b.editWorkspace('b');
  b.set(SCHEME, 0); b.edit(theme(10));
  assert.equal(b.workspaces[0].theme.rotation, 80);
  b.set(SCHEME, 1);
  assert.equal(b.picker.visible.rotation, 65);
  assert.equal(b.record('b').dark.rotation, 10);
  assert.equal(b.record('a').light.rotation, 80);
});

test('disable keeps current appearance, allows normal editing, and preserves both snapshots', () => {
  const b = enabledBrowser();
  b.edit(theme(95)); b.set(SCHEME, 0); b.edit(theme(20));
  b.set(ENABLED, false); b.set(SCHEME, 1);
  assert.equal(b.workspaces[0].theme.rotation, 20);
  b.edit(theme(40));
  assert.equal(b.record().dark.rotation, 20);
  b.set(ENABLED, true);
  assert.equal(b.picker.visible.rotation, 95);
  b.set(SCHEME, 0); assert.equal(b.picker.visible.rotation, 20);
});

test('restart selects the stored variant even when the last native theme is the other mode', () => {
  const first = enabledBrowser();
  first.edit(theme(94)); first.set(SCHEME, 0); first.edit(theme(14));
  first.feature.uninit();
  first.shared.set(SCHEME, 1);
  const restarted = browser({ shared: first.shared, workspaces: clone(first.workspaces) });
  assert.deepEqual(restarted.picker.visible, theme(94));
});

test('other windows observe snapshots without overwriting or notification loops', () => {
  const shared = preferenceService({ [ENABLED]: true, [SCHEME]: 1 });
  const first = browser({ shared }); const second = browser({ shared });
  first.edit(theme(96)); second.flush(); first.flush();
  assert.equal(second.picker.visible.rotation, 96);
  shared.set(SCHEME, 0); first.flush(); second.flush();
  second.edit(theme(16)); first.flush(); second.flush();
  assert.equal(first.picker.visible.rotation, 16);
  assert.equal(first.record().light.rotation, 96);
  assert.ok(first.counts.saves + second.counts.saves < 15);
});

test('corrupt and future snapshots are not overwritten', () => {
  for (const saved of ['{broken', JSON.stringify({ version: 2, light: theme(1), dark: theme(2) })]) {
    const shared = preferenceService({ [ENABLED]: true, [PREFIX + 'a']: saved });
    const b = browser({ shared });
    b.edit(theme(70)); b.set(SCHEME, 0);
    assert.equal(shared.data.get(PREFIX + 'a'), saved);
  }
});

test('mode change waits for a drag and does not capture outgoing edits in the new mode', () => {
  const b = enabledBrowser();
  b.edit(theme(91)); b.drag(true); b.set(SCHEME, 0);
  b.edit(theme(50));
  assert.equal(b.record().dark.rotation, 80);
  b.drag(false); b.flush();
  assert.equal(b.picker.visible.rotation, 80);
  assert.equal(b.record().light.rotation, 91);
});

test('private windows use dark snapshots without persisting private edits', () => {
  const regular = enabledBrowser();
  regular.set(SCHEME, 0); regular.edit(theme(11)); regular.set(SCHEME, 1);
  const before = [...regular.shared.data];
  const b = browser({ shared: regular.shared, privateWindow: true });
  assert.equal(b.picker.visible.rotation, 11);
  b.edit(theme(7)); b.dark(false);
  assert.equal(b.picker.visible.rotation, 7);
  assert.deepEqual([...regular.shared.data], before);
});

test('legacy dynamic and inversion preferences are gated without changing saved settings', () => {
  const shared = preferenceService({
    [ENABLED]: true, 'zen.theme.dynamic-theme-switching': true, 'zen.theme.lightness-inversion': true,
  });
  const context = vm.createContext({ Services: { prefs: shared.prefs }, XPCOMUtils: {
    defineLazyPreferenceGetter(target, property, pref, fallback) {
      Object.defineProperty(target, property, { get: () => shared.prefs.getBoolPref(pref, fallback) });
    },
  } });
  vm.runInContext(section('  const lazy = {};', '  const OPACITY_EPSILON') + '\nglobalThis.settings = lazy;', context);
  assert.equal(context.settings.gDynamicThemeSwitching, false);
  assert.equal(context.settings.gLightnessInversion, false);
  shared.set(ENABLED, false);
  assert.equal(context.settings.gDynamicThemeSwitching, true);
  assert.equal(context.settings.gLightnessInversion, true);
});

test('favorite-style replacement preserves arbitrary custom colors and the other variant', () => {
  const b = enabledBrowser();
  const favorite = theme(77);
  favorite.gradientColors = [{ c: '#ff8844', isCustom: true, isPrimary: true, algorithm: 'floating' }];
  b.workspaces[0].theme = clone(favorite);
  b.picker.onWorkspaceChange(b.workspaces[0], true, favorite);
  b.manager.saveWorkspace(b.workspaces[0]);
  b.set(SCHEME, 0);
  assert.deepEqual(b.picker.visible, theme(80));
  b.set(SCHEME, 1);
  assert.deepEqual(b.picker.visible, favorite);
});

test('new workspaces seed their own pair and cached renders select the right variant', () => {
  const b = enabledBrowser();
  b.workspaces.push({ uuid: '{new space}', theme: theme(55) });
  b.activate('{new space}'); b.edit(theme(88)); b.set(SCHEME, 0);
  assert.deepEqual(b.picker.getGradientForWorkspace(b.workspaces[1]), theme(55));
  b.edit(theme(9)); b.set(SCHEME, 1);
  assert.deepEqual(b.picker.getGradientForWorkspace(b.workspaces[1]), theme(88));
  assert.equal(b.record('{new space}').dark.rotation, 9);
});

test('uninit removes preference and media listeners', () => {
  const b = enabledBrowser();
  const before = b.counts.renders;
  b.feature.uninit(); b.set(SCHEME, 0); b.dark(true); b.flush();
  assert.equal(b.counts.renders, before);
});
