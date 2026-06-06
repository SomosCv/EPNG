const app = document.getElementById('app');
let eventsBound = false;

const state = {
  clientId: null,
  base: '',
  config: null,
  lang: 'en',
  dict: {},
  data: {},
  screen: 'home',
  installPrompt: null,
  supportedLanguages: []
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pick = value => {
  if (typeof value === 'object' && value) {
    return value[state.lang] || value.en || Object.values(value)[0] || '';
  }
  return value ?? '';
};
const t = key => state.dict[key] || key;
const storageKey = suffix => `${state.clientId}:${suffix}`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const escapeAttr = escapeHTML;

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${url}`);
  return r.json();
}

function normalizeLanguages() {
  const configured = Array.isArray(state.config?.languages) && state.config.languages.length ? state.config.languages : ['en'];
  state.supportedLanguages = configured.map(lang => {
    if (typeof lang === 'string') {
      return { code: lang, label: lang.toUpperCase(), nativeName: lang.toUpperCase() };
    }
    return {
      code: lang.code,
      label: lang.label || lang.name || String(lang.code).toUpperCase(),
      nativeName: lang.nativeName || lang.label || lang.name || String(lang.code).toUpperCase()
    };
  }).filter(lang => lang.code);

  if (!state.supportedLanguages.length) {
    state.supportedLanguages = [{ code: 'en', label: 'English', nativeName: 'English' }];
  }
}

function supportedLanguageCodes() {
  return state.supportedLanguages.map(lang => lang.code);
}

function validLanguage(code) {
  return supportedLanguageCodes().includes(code);
}

function languageLabel(code) {
  return state.supportedLanguages.find(lang => lang.code === code)?.nativeName || code.toUpperCase();
}

async function init() {
  try {
    const params = new URLSearchParams(location.search);
    const active = await fetchJSON('active-client.json');
    state.clientId = params.get('client') || active.clientId;
    state.base = `clients/${state.clientId}/`;
    state.config = await fetchJSON(state.base + 'config.json');
    normalizeLanguages();

    const requested = params.get('lang') || localStorage.getItem(storageKey('lang')) || state.config.defaultLanguage || 'en';
    state.lang = validLanguage(requested) ? requested : (validLanguage(state.config.defaultLanguage) ? state.config.defaultLanguage : state.supportedLanguages[0].code);

    await loadLanguage(state.lang);
    await loadThemeAndManifest();
    await loadData();
    restorePrefs();
    render();
    registerSW();
  } catch (e) {
    app.innerHTML = `<main class="panel" style="margin:2rem"><h1>Guide could not load</h1><p>${escapeHTML(e.message)}</p></main>`;
  }
}

async function loadLanguage(langCode = state.lang) {
  const fallbackCode = validLanguage(state.config.defaultLanguage) ? state.config.defaultLanguage : state.supportedLanguages[0].code;
  let fallbackDict = {};

  try {
    fallbackDict = await fetchJSON(`${state.base}languages/${fallbackCode}.json`);
  } catch (_) {
    fallbackDict = {};
  }

  try {
    const selectedDict = await fetchJSON(`${state.base}languages/${langCode}.json`);
    state.lang = langCode;
    state.dict = { ...fallbackDict, ...selectedDict };
  } catch (_) {
    state.lang = fallbackCode;
    state.dict = fallbackDict;
    localStorage.setItem(storageKey('lang'), state.lang);
    toast(`Language file unavailable. Showing ${languageLabel(state.lang)}.`);
  }

  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.supportedLanguages.find(lang => lang.code === state.lang)?.dir || 'ltr';
}

async function setLanguage(nextLang) {
  if (!validLanguage(nextLang) || nextLang === state.lang) return;
  localStorage.setItem(storageKey('lang'), nextLang);
  await loadLanguage(nextLang);
  render();
  toast(`${t('languageChanged') || t('language')}: ${languageLabel(state.lang)}`);
}

async function loadThemeAndManifest() {
  let link = document.getElementById('client-theme');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'client-theme';
    document.head.appendChild(link);
  }
  link.href = state.base + 'theme.css';

  let manifest = document.querySelector('link[rel="manifest"]');
  if (!manifest) {
    manifest = document.createElement('link');
    manifest.rel = 'manifest';
    document.head.appendChild(manifest);
  }
  manifest.href = state.base + 'manifest.json';

  document.title = state.config.appName;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.config.brand.primaryColor);
}

async function loadData() {
  const names = ['cards', 'sections', 'checklists', 'flows', 'roles', 'resources'];
  await Promise.all(names.map(async name => {
    state.data[name] = await fetchJSON(`${state.base}data/${name}.json`);
  }));
}

function restorePrefs() {
  document.body.classList.toggle('dark', localStorage.getItem(storageKey('theme')) === 'dark');
  document.body.classList.toggle('large-text', localStorage.getItem(storageKey('textSize')) === 'large');
}

function render() {
  app.innerHTML = `${hero()}<main id="main" class="main" tabindex="-1">${screenHome()}${screenStart()}${screenHousehold()}${screenKit()}${screenPlan()}${screenQuick()}${screenRoles()}${screenHazards()}${screenResources()}${screenSettings()}</main>${bottomNav()}<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>`;
  bind();
  showScreen(state.screen, false);
}

function iconHTML(icon, fallback = 'fa-solid fa-circle') {
  const cls = escapeAttr(icon || fallback);
  return `<i class="${cls}" aria-hidden="true"></i>`;
}

function languageSelectHTML() {
  return `<label class="language-control"><span class="sr-only">${t('language')}</span><i class="fa-solid fa-language" aria-hidden="true"></i><select id="language-select" data-action="language-select" aria-label="${t('language')}">${state.supportedLanguages.map(lang => `<option value="${escapeAttr(lang.code)}" ${lang.code === state.lang ? 'selected' : ''}>${escapeHTML(lang.nativeName || lang.label)}</option>`).join('')}</select></label>`;
}

function hero() {
  return `<header class="hero"><div class="topbar"><div class="brand"><img src="${state.base + state.config.brand.logo}" alt=""><span>${escapeHTML(state.config.shortName)}</span></div><div class="toolbar">${languageSelectHTML()}<button class="btn ghost" data-action="text">${iconHTML('fa-solid fa-text-height')}<span>${document.body.classList.contains('large-text') ? t('normalText') : t('largeText')}</span></button><button class="btn ghost" data-action="theme">${iconHTML('fa-solid fa-circle-half-stroke')}<span>${t('theme')}</span></button><button class="btn primary" data-action="install">${iconHTML('fa-solid fa-download')}<span>${t('install')}</span></button></div></div><div class="hero-copy"><div class="eyebrow">${t('offlineReady')}</div><h1>${escapeHTML(state.config.appName)}</h1><p>${t('heroDescription')}</p><div class="hero-actions"><button class="btn primary" data-screen="start">${iconHTML('fa-solid fa-route')}<span>${t('start')}</span></button><button class="btn secondary" data-screen="kit">${iconHTML('fa-solid fa-list-check')}<span>${t('kit')}</span></button><button class="btn danger" data-screen="quick">${iconHTML('fa-solid fa-bolt')}<span>${t('quick')}</span></button></div></div></header>`;
}

function navIcon(screen) {
  const icons = {
    home: 'fa-solid fa-house',
    start: 'fa-solid fa-route',
    kit: 'fa-solid fa-list-check',
    plan: 'fa-solid fa-people-roof',
    quick: 'fa-solid fa-bolt',
    resources: 'fa-solid fa-phone-volume'
  };
  return iconHTML(icons[screen]);
}

function bottomNav() {
  return `<nav class="bottom-nav" aria-label="Primary"><button class="nav-btn" data-screen="home">${navIcon('home')}<span>${t('home')}</span></button><button class="nav-btn" data-screen="start">${navIcon('start')}<span>${t('start')}</span></button><button class="nav-btn" data-screen="kit">${navIcon('kit')}<span>${t('kit')}</span></button><button class="nav-btn" data-screen="plan">${navIcon('plan')}<span>${t('plan')}</span></button><button class="nav-btn" data-screen="quick">${navIcon('quick')}<span>${t('quick')}</span></button><button class="nav-btn" data-screen="resources">${navIcon('resources')}<span>${t('resources')}</span></button></nav>`;
}

function screenHome() {
  return `<section id="screen-home" class="screen"><div class="cards">${state.data.cards.map(card => `<button class="card" data-screen="${card.screen}"><span class="section-icon" aria-hidden="true">${iconHTML(card.icon)}</span><h2>${pick(card.title)}</h2><p>${pick(card.description)}</p></button>`).join('')}</div></section>`;
}

function sectionScreen(id) {
  const section = state.data.sections[id];
  return `<section id="screen-${id}" class="screen"><div class="panel"><div class="panel-header"><div><h2>${pick(section.title)}</h2><p class="muted">${pick(section.summary)}</p></div><button class="btn" data-screen="home">${iconHTML('fa-solid fa-house')}<span>${t('home')}</span></button></div></div><div class="grid-2">${(section.items || []).map(item => `<article class="section-card"><span class="section-icon" aria-hidden="true">${iconHTML(item.icon || item.fa || 'fa-solid fa-circle-info')}</span><h3>${pick(item.title)}</h3><p>${pick(item.body)}</p></article>`).join('')}</div></section>`;
}

function screenStart() {
  return sectionScreen('start');
}

function screenHousehold() {
  const section = state.data.sections.household;
  return `<section id="screen-household" class="screen"><div class="panel"><div class="panel-header"><div><h2>${pick(section.title)}</h2><p class="muted">${pick(section.summary)}</p></div><button class="btn" data-screen="home">${iconHTML('fa-solid fa-house')}<span>${t('home')}</span></button></div></div><div class="grid-2">${(section.items || []).map(item => `<article class="section-card"><span class="section-icon" aria-hidden="true">${iconHTML(item.icon || item.fa || 'fa-solid fa-circle-check')}</span><h3>${pick(item.title)}</h3><p>${pick(item.body)}</p></article>`).join('')}</div><div class="panel">${checklistHTML('household')}</div></section>`;
}

function checklistHTML(name) {
  const checklist = state.data.checklists[name];
  const saved = JSON.parse(localStorage.getItem(storageKey('checks:' + name)) || '{}');
  const total = checklist.items.length;
  const done = checklist.items.filter(item => saved[item.id]).length;
  return `<div class="panel-header"><div><h2>${pick(checklist.title)}</h2><p class="muted">${done}/${total} ${t('complete')}</p></div><button class="btn" data-reset-checks="${name}">${iconHTML('fa-solid fa-rotate-left')}<span>${t('clear')}</span></button></div><div class="progress-bar" aria-hidden="true"><span style="width:${total ? done / total * 100 : 0}%"></span></div><div>${checklist.items.map(item => `<label class="check-item"><input type="checkbox" data-checklist="${name}" data-check="${item.id}" ${saved[item.id] ? 'checked' : ''}><span>${pick(item.label)}</span></label>`).join('')}</div>`;
}

function screenKit() {
  return `<section id="screen-kit" class="screen"><div class="panel">${checklistHTML('readyKit')}</div></section>`;
}

function screenPlan() {
  const plan = JSON.parse(localStorage.getItem(storageKey('plan')) || '{}');
  const fields = [
    ['neighborhoodName', t('neighborhoodName')],
    ['gatheringSite', t('gatheringSite')],
    ['careSite', t('careSite')],
    ['coordinator', t('coordinator')],
    ['liaison', t('liaison')],
    ['radioRelay', t('radioRelay')],
    ['communicationMethods', t('communicationMethods')],
    ['skillsEquipment', t('skillsEquipment')],
    ['specialNeedsNotes', t('specialNeedsNotes')],
    ['annualReviewDate', t('annualReviewDate')]
  ];

  return `<section id="screen-plan" class="screen"><div class="panel"><div class="panel-header"><div><h2>${t('planBuilder')}</h2><p class="muted">${t('planDescription')}</p></div><button class="btn" data-screen="quick">${iconHTML('fa-solid fa-bolt')}<span>${t('quick')}</span></button></div><form id="plan-form" class="form-grid">${fields.map(([key, label]) => `<label class="field"><span>${label}</span><textarea name="${key}">${escapeHTML(plan[key] || '')}</textarea></label>`).join('')}<div><button class="btn primary" type="submit">${iconHTML('fa-solid fa-floppy-disk')}<span>${t('save')}</span></button></div></form></div><div class="panel">${checklistHTML('planSteps')}</div></section>`;
}

function screenQuick() {
  const flow = state.data.flows.emergency;
  return `<section id="screen-quick" class="screen"><div class="panel"><div class="panel-header"><div><h2>${pick(flow.title)}</h2><p class="muted">${t('quickDescription')}</p></div><a class="btn danger" href="tel:911">${iconHTML('fa-solid fa-phone')}<span>${t('call')} 911</span></a></div></div><div class="grid-2">${flow.steps.map(step => `<article class="step-card quick-step"><div class="step-num">${step.number}</div><div><h3>${pick(step.title)}</h3><p>${pick(step.body)}</p></div></article>`).join('')}</div></section>`;
}

function screenRoles() {
  return `<section id="screen-roles" class="screen"><div class="panel"><h2>${t('roles')}</h2><p class="muted">${t('rolesDescription')}</p></div><div class="grid-2">${state.data.roles.roles.map(role => `<article class="role-card"><span class="section-icon" aria-hidden="true">${iconHTML(role.icon || 'fa-solid fa-user-shield')}</span><h3>${pick(role.title)}</h3><p>${pick(role.body)}</p></article>`).join('')}</div></section>`;
}

function screenHazards() {
  const section = state.data.sections.hazards;
  return `<section id="screen-hazards" class="screen"><div class="panel"><h2>${pick(section.title)}</h2><p class="muted">${t('hazardsDescription')}</p></div><div class="grid-2">${section.groups.map(group => `<article class="section-card"><span class="section-icon" aria-hidden="true">${iconHTML(group.icon || 'fa-solid fa-triangle-exclamation')}</span><h3>${pick(group.title)}</h3><ul>${group.items.map(item => `<li>${pick(item)}</li>`).join('')}</ul></article>`).join('')}</div></section>`;
}

function screenResources() {
  return `<section id="screen-resources" class="screen"><div class="panel"><h2>${t('resources')}</h2><label class="field"><span>${t('search')}</span><input class="search-input" id="resource-search" placeholder="${t('searchPlaceholder')}"></label></div><div id="resources-list" class="grid-2">${resourcesHTML(state.data.resources)}</div></section>`;
}

function resourcesHTML(list) {
  return list.map(resource => `<article class="resource-card"><span class="section-icon" aria-hidden="true">${iconHTML(resource.icon || 'fa-solid fa-phone-volume')}</span><h3>${escapeHTML(resource.name)}</h3><p class="muted">${escapeHTML(resource.category)}</p><p>${pick(resource.description)}</p><div class="resource-actions">${resource.phone ? `<a class="btn primary" href="${resource.href}">${iconHTML('fa-solid fa-phone')}<span>${t('call')} ${resource.phone}</span></a>` : ''}${resource.website ? `<a class="btn" target="_blank" rel="noopener" href="${resource.website}">${iconHTML('fa-solid fa-arrow-up-right-from-square')}<span>${t('openWebsite')}</span></a>` : ''}</div></article>`).join('');
}

function screenSettings() {
  return `<section id="screen-settings" class="screen"><div class="panel"><h2>${t('settings')}</h2><p>${t('privacy')}</p><div class="hero-actions"><a class="btn primary" href="${state.base}assets/pdfs/emergency-preparedness-neighborhood-guide.pdf" download>${iconHTML('fa-solid fa-file-pdf')}<span>${t('downloadPdf')}</span></a><button class="btn danger" data-action="reset">${iconHTML('fa-solid fa-trash')}<span>${t('resetProgress')}</span></button></div></div></section>`;
}

function showScreen(name = 'home', focus = true) {
  state.screen = name;
  $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === `screen-${name}`));
  $$('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.screen === name));
  if (focus) $('#main')?.focus();
}

function bind() {
  if (eventsBound) return;
  eventsBound = true;

  app.addEventListener('click', async event => {
    const screen = event.target.closest('[data-screen]')?.dataset.screen;
    if (screen) showScreen(screen);

    const action = event.target.closest('[data-action]')?.dataset.action;

    if (action === 'theme') {
      document.body.classList.toggle('dark');
      localStorage.setItem(storageKey('theme'), document.body.classList.contains('dark') ? 'dark' : 'light');
    }

    if (action === 'text') {
      document.body.classList.toggle('large-text');
      localStorage.setItem(storageKey('textSize'), document.body.classList.contains('large-text') ? 'large' : 'normal');
      render();
    }

    if (action === 'lang') {
      const langs = supportedLanguageCodes();
      const currentIndex = langs.indexOf(state.lang);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % langs.length;
      await setLanguage(langs[nextIndex]);
    }

    if (action === 'install' && state.installPrompt) {
      state.installPrompt.prompt();
      state.installPrompt = null;
    }

    if (action === 'reset') {
      Object.keys(localStorage).filter(key => key.startsWith(state.clientId + ':')).forEach(key => localStorage.removeItem(key));
      toast(t('resetDone'));
      await init();
    }

    const reset = event.target.closest('[data-reset-checks]')?.dataset.resetChecks;
    if (reset) {
      localStorage.removeItem(storageKey('checks:' + reset));
      render();
      showScreen(state.screen, false);
    }
  });

  app.addEventListener('change', async event => {
    if (event.target.matches('[data-action="language-select"]')) {
      await setLanguage(event.target.value);
      return;
    }

    if (event.target.matches('[data-checklist]')) {
      const name = event.target.dataset.checklist;
      const id = event.target.dataset.check;
      const saved = JSON.parse(localStorage.getItem(storageKey('checks:' + name)) || '{}');
      saved[id] = event.target.checked;
      localStorage.setItem(storageKey('checks:' + name), JSON.stringify(saved));
      render();
      showScreen(state.screen, false);
    }
  });

  app.addEventListener('submit', event => {
    if (event.target.id === 'plan-form') {
      event.preventDefault();
      const obj = Object.fromEntries(new FormData(event.target).entries());
      localStorage.setItem(storageKey('plan'), JSON.stringify(obj));
      toast(t('saved'));
    }
  });

  app.addEventListener('input', event => {
    if (event.target.id === 'resource-search') {
      const q = event.target.value.toLowerCase();
      const list = state.data.resources.filter(resource => `${resource.name} ${resource.category} ${resource.phone} ${pick(resource.description)}`.toLowerCase().includes(q));
      $('#resources-list').innerHTML = resourcesHTML(list);
    }
  });
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2600);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.installPrompt = event;
  });
}

init();
