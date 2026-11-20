// Vice Cover Studio — editor wiring.
//
// Loads photos, wires every control to the renderer, and drives the
// screenshot scenes (?shot=cover, ?shot=cover-portrait, ?shot=cover-square,
// ?shot=editor) the entry's screenshots are taken from.

import {
  LAYOUTS,
  GRADES,
  EXPORT_SIZES,
  drawCover,
  panelRects,
  panelCount,
} from './render.js';

const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard sample', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier sample', src: 'samples/pier.jpg' },
  { id: 'portrait', label: 'Portrait sample', src: 'samples/portrait.jpg' },
];

// The opening crop for each panel when the samples load: the hero photo
// sits a little high so the face leads, the middle strip photo a touch
// high too, the rest straight cover-fit.
const DEFAULT_CROPS = [
  { zoom: 1.05, panX: 0, panY: -0.12 },
  { zoom: 1, panX: 0, panY: 0 },
  { zoom: 1, panX: 0, panY: -0.05 },
  { zoom: 1, panX: 0, panY: 0 },
];

const PANEL_ROLES = {
  hero: ['hero', 'bottom left', 'bottom middle', 'bottom right'],
  grid: ['top left', 'top right', 'bottom left', 'bottom right'],
  bleed: ['cover'],
  tilted: ['left snapshot', 'middle snapshot', 'right snapshot'],
};

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'VICE NIGHTS',
  subtitle: 'PALM CITY HEAT',
  tagline: 'ONE LAST SCORE',
  size: '1920x1080',
  selected: 0,
  photos: [null, null, null, null],
  currentPhoto: null,
};

const stage = document.getElementById('stage');
const stageCtx = stage.getContext('2d');
const statusLine = document.getElementById('statusLine');
const photoInput = document.getElementById('photoInput');
const addPhotoBtn = document.getElementById('addPhotoBtn');
const fillAllBtn = document.getElementById('fillAllBtn');
const panelLabel = document.getElementById('panelLabel');
const zoomRange = document.getElementById('zoomRange');
const panXRange = document.getElementById('panXRange');
const panYRange = document.getElementById('panYRange');
const resetCropBtn = document.getElementById('resetCropBtn');
const swapBtn = document.getElementById('swapBtn');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const taglineInput = document.getElementById('taglineInput');
const layoutGroup = document.getElementById('layoutGroup');
const gradeGroup = document.getElementById('gradeGroup');
const sizeSelect = document.getElementById('sizeSelect');
const exportBtn = document.getElementById('exportBtn');

function say(message) {
  statusLine.textContent = message;
}

function clampNumber(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function sizeFor(id) {
  return EXPORT_SIZES.find((entry) => entry.id === id) || EXPORT_SIZES[0];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

function loadLocalFile(file) {
  const url = URL.createObjectURL(file);
  return loadImage(url);
}

let drawQueued = false;

function draw() {
  drawQueued = false;
  drawCover(stageCtx, state, stage.width, stage.height);
}

function drawSoon() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(draw);
}

function fitPreview() {
  const size = sizeFor(state.size);
  const scale = Math.min(1, 900 / Math.max(size.width, size.height));
  stage.width = Math.round(size.width * scale);
  stage.height = Math.round(size.height * scale);
}

function selectedPhoto() {
  return state.photos[state.selected] || null;
}

function roleName(index) {
  const roles = PANEL_ROLES[state.layout] || PANEL_ROLES.hero;
  return roles[index] || `panel ${index + 1}`;
}

function syncControls() {
  const total = panelCount(state.layout);
  const photo = selectedPhoto();
  panelLabel.textContent = `Panel ${state.selected + 1} of ${total} — ${roleName(state.selected)}${photo ? '' : ' (empty)'}`;
  zoomRange.value = String(photo ? photo.zoom : 1);
  panXRange.value = String(photo ? photo.panX : 0);
  panYRange.value = String(photo ? photo.panY : 0);
  layoutGroup.querySelectorAll('[data-layout]').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layout);
  });
  gradeGroup.querySelectorAll('[data-grade]').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.grade);
  });
  sizeSelect.value = state.size;
}

function placePhoto(img, slot, crop) {
  state.photos[slot] = {
    img,
    zoom: crop ? crop.zoom : 1,
    panX: crop ? crop.panX : 0,
    panY: crop ? crop.panY : 0,
  };
  state.currentPhoto = img;
}

async function loadSamples() {
  const loaded = await Promise.all(SAMPLES.map((sample) => loadImage(sample.src)));
  const byId = {};
  SAMPLES.forEach((sample, index) => {
    byId[sample.id] = loaded[index];
  });
  placePhoto(byId.boulevard, 0, DEFAULT_CROPS[0]);
  placePhoto(byId.pier, 1, DEFAULT_CROPS[1]);
  placePhoto(byId.boulevard, 2, DEFAULT_CROPS[2]);
  placePhoto(byId.pier, 3, DEFAULT_CROPS[3]);
  state.currentPhoto = byId.boulevard;
  syncControls();
  drawSoon();
  return byId;
}

function wireControls() {
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      const sample = SAMPLES.find((entry) => entry.id === button.dataset.sample);
      if (!sample) return;
      try {
        const img = await loadImage(sample.src);
        placePhoto(img, state.selected, null);
        syncControls();
        drawSoon();
        say(`${sample.label} loaded into panel ${state.selected + 1}.`);
      } catch (error) {
        say(`Could not load ${sample.label}.`);
      }
    });
  });

  fillAllBtn.addEventListener('click', () => {
    if (!state.currentPhoto) {
      say('Pick a sample or add a photo first.');
      return;
    }
    state.photos = state.photos.map((photo) => ({
      img: state.currentPhoto,
      zoom: photo ? photo.zoom : 1,
      panX: photo ? photo.panX : 0,
      panY: photo ? photo.panY : 0,
    }));
    drawSoon();
    say('Every panel now shows the same photo.');
  });

  addPhotoBtn.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0];
    photoInput.value = '';
    if (!file) return;
    try {
      const img = await loadLocalFile(file);
      placePhoto(img, state.selected, null);
      syncControls();
      drawSoon();
      say(`${file.name} loaded into panel ${state.selected + 1}.`);
    } catch (error) {
      say('That file could not be read as a photo.');
    }
  });

  zoomRange.addEventListener('input', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.zoom = clampNumber(parseFloat(zoomRange.value), 1, 3);
    drawSoon();
  });
  panXRange.addEventListener('input', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.panX = clampNumber(parseFloat(panXRange.value), -0.5, 0.5);
    drawSoon();
  });
  panYRange.addEventListener('input', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.panY = clampNumber(parseFloat(panYRange.value), -0.5, 0.5);
    drawSoon();
  });

  resetCropBtn.addEventListener('click', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.zoom = 1;
    photo.panX = 0;
    photo.panY = 0;
    syncControls();
    drawSoon();
    say(`Panel ${state.selected + 1} crop reset.`);
  });

  swapBtn.addEventListener('click', () => {
    const total = panelCount(state.layout);
    const next = (state.selected + 1) % total;
    const held = state.photos[state.selected];
    state.photos[state.selected] = state.photos[next];
    state.photos[next] = held;
    drawSoon();
    say(`Swapped panel ${state.selected + 1} with panel ${next + 1}.`);
  });

  layoutGroup.addEventListener('click', (event) => {
    const button = event.target.closest('[data-layout]');
    if (!button) return;
    state.layout = button.dataset.layout;
    state.selected = 0;
    syncControls();
    drawSoon();
    say(`Layout: ${LAYOUTS.find((entry) => entry.id === state.layout).name}.`);
  });

  gradeGroup.addEventListener('click', (event) => {
    const button = event.target.closest('[data-grade]');
    if (!button) return;
    state.grade = button.dataset.grade;
    syncControls();
    drawSoon();
    say(`Grade: ${GRADES.find((entry) => entry.id === state.grade).name}.`);
  });

  sizeSelect.addEventListener('change', () => {
    state.size = sizeSelect.value;
    fitPreview();
    drawSoon();
    const size = sizeFor(state.size);
    say(`Post size: ${size.width} x ${size.height}.`);
  });

  titleInput.addEventListener('input', () => {
    state.title = titleInput.value;
    drawSoon();
  });
  subtitleInput.addEventListener('input', () => {
    state.subtitle = subtitleInput.value;
    drawSoon();
  });
  taglineInput.addEventListener('input', () => {
    state.tagline = taglineInput.value;
    drawSoon();
  });
}

// Hit-test the preview canvas: which panel sits under a pointer event.
function panelAt(clientX, clientY) {
  const box = stage.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * stage.width;
  const y = ((clientY - box.top) / box.height) * stage.height;
  const rects = panelRects(state.layout, stage.width, stage.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const rect = rects[i];
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return i;
  }
  return -1;
}

function wireCanvas() {
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;

  stage.addEventListener('pointerdown', (event) => {
    const hit = panelAt(event.clientX, event.clientY);
    if (hit < 0) return;
    state.selected = hit;
    syncControls();
    drawSoon();
    dragging = true;
    moved = false;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const photo = selectedPhoto();
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 0) moved = true;
    if (!photo || !photo.img) return;
    const box = stage.getBoundingClientRect();
    const scaleX = stage.width / box.width;
    const scaleY = stage.height / box.height;
    const rects = panelRects(state.layout, stage.width, stage.height);
    const rect = rects[state.selected];
    if (!rect) return;
    const base = Math.max(rect.w / photo.img.naturalWidth, rect.h / photo.img.naturalHeight);
    const scaled = base * photo.zoom;
    const overX = Math.max(1, photo.img.naturalWidth * scaled - rect.w);
    const overY = Math.max(1, photo.img.naturalHeight * scaled - rect.h);
    photo.panX = clampNumber(photo.panX + (dx * scaleX) / overX, -0.5, 0.5);
    photo.panY = clampNumber(photo.panY + (dy * scaleY) / overY, -0.5, 0.5);
    syncControls();
    drawSoon();
  });

  stage.addEventListener('pointerup', () => {
    dragging = false;
    if (!moved) drawSoon();
  });

  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    const photo = selectedPhoto();
    if (!photo) return;
    photo.zoom = clampNumber(photo.zoom * Math.exp(-event.deltaY * 0.0012), 1, 3);
    syncControls();
    drawSoon();
  }, { passive: false });

  stage.addEventListener('keydown', (event) => {
    const photo = selectedPhoto();
    if (!photo) return;
    const step = 0.03;
    if (event.key === 'ArrowLeft') photo.panX = clampNumber(photo.panX - step, -0.5, 0.5);
    else if (event.key === 'ArrowRight') photo.panX = clampNumber(photo.panX + step, -0.5, 0.5);
    else if (event.key === 'ArrowUp') photo.panY = clampNumber(photo.panY - step, -0.5, 0.5);
    else if (event.key === 'ArrowDown') photo.panY = clampNumber(photo.panY + step, -0.5, 0.5);
    else return;
    event.preventDefault();
    syncControls();
    drawSoon();
  });

  stage.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  stage.addEventListener('drop', async (event) => {
    event.preventDefault();
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const hit = panelAt(event.clientX, event.clientY);
    const slot = hit >= 0 ? hit : state.selected;
    try {
      const img = await loadLocalFile(file);
      placePhoto(img, slot, null);
      state.selected = slot;
      syncControls();
      drawSoon();
      say(`${file.name} loaded into panel ${slot + 1}.`);
    } catch (error) {
      say('That file could not be read as a photo.');
    }
  });
}

function exportCover() {
  const size = sizeFor(state.size);
  const offscreen = document.createElement('canvas');
  offscreen.width = size.width;
  offscreen.height = size.height;
  drawCover(offscreen.getContext('2d'), state, size.width, size.height);
  offscreen.toBlob((blob) => {
    if (!blob) {
      say('Export failed — try again.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vice-cover-${size.width}x${size.height}.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    say(`Exported vice-cover-${size.width}x${size.height}.png`);
  }, 'image/png');
}

async function readyFont() {
  try {
    await document.fonts.load('100px Anton');
  } catch (error) {
    // The fallback stack still letters the cover.
  }
}

// Screenshot scenes: each one draws a finished cover full-frame, or opens
// the editor with the samples loaded.
const SHOT_SCENES = {
  cover: { layout: 'hero', grade: 'sunset', size: '1920x1080' },
  'cover-portrait': { layout: 'grid', grade: 'neon', size: '1080x1350' },
  'cover-square': { layout: 'bleed', grade: 'sunset', size: '1080x1080', photo: 'pier' },
};

function sizeStageToWindow() {
  const dpr = window.devicePixelRatio || 1;
  stage.width = Math.round(window.innerWidth * dpr);
  stage.height = Math.round(window.innerHeight * dpr);
}

async function runShotScene(scene) {
  document.body.classList.add('shot');
  Object.assign(state, scene);
  const samples = await loadSamples();
  if (scene.photo && samples[scene.photo]) {
    state.photos[0] = { img: samples[scene.photo], zoom: 1, panX: 0, panY: 0 };
    state.currentPhoto = samples[scene.photo];
  }
  await readyFont();
  sizeStageToWindow();
  draw();
  document.fonts.ready.then(() => draw());
}

async function init() {
  wireControls();
  wireCanvas();
  exportBtn.addEventListener('click', exportCover);
  syncControls();
  const shot = new URLSearchParams(location.search).get('shot');
  const scene = shot ? SHOT_SCENES[shot] : null;
  if (scene) {
    await runShotScene(scene);
    return;
  }
  fitPreview();
  try {
    await loadSamples();
  } catch (error) {
    say('Samples could not load — add your own photo to start.');
  }
  await readyFont();
  draw();
  document.fonts.ready.then(() => draw());
  say('Samples loaded — pick a layout, a grade, then export your cover.');
}

init();
