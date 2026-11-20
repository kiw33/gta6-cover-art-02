// Vice Cover Studio — the cover renderer.
//
// One drawing routine serves the live preview and the PNG export: give it
// a canvas context, the editor state and a pixel size, and it paints the
// same cover at any size. Nothing here touches the network or the DOM
// beyond the canvas it is handed.

export const LAYOUTS = [
  { id: 'hero', name: 'Hero + 3', panels: 4 },
  { id: 'grid', name: '2 x 2 grid', panels: 4 },
  { id: 'bleed', name: 'Full bleed', panels: 1 },
  { id: 'tilted', name: 'Tilted snapshots', panels: 3 },
];

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset' },
  { id: 'neon', name: 'Neon Nights' },
  { id: 'noir', name: 'Palm Noir' },
  { id: 'pastel', name: 'Pastel Vice' },
];

export const EXPORT_SIZES = [
  { id: '1920x1080', label: 'Wide · 1920 x 1080', width: 1920, height: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 x 1350', width: 1080, height: 1350 },
  { id: '1080x1080', label: 'Square · 1080 x 1080', width: 1080, height: 1080 },
];

export function panelCount(layoutId) {
  const found = LAYOUTS.find((entry) => entry.id === layoutId);
  return found ? found.panels : 4;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

// Panel rectangles for a layout, in canvas pixels. Every rect carries its
// rotation in radians (0 for the straight layouts) and the index of the
// photo slot that fills it.
export function panelRects(layoutId, w, h) {
  const gap = Math.max(3, Math.round(Math.min(w, h) * 0.005));
  if (layoutId === 'grid') {
    const cellW = (w - gap) / 2;
    const cellH = (h - gap) / 2;
    return [
      { x: 0, y: 0, w: cellW, h: cellH, rot: 0, slot: 0 },
      { x: cellW + gap, y: 0, w: cellW, h: cellH, rot: 0, slot: 1 },
      { x: 0, y: cellH + gap, w: cellW, h: cellH, rot: 0, slot: 2 },
      { x: cellW + gap, y: cellH + gap, w: cellW, h: cellH, rot: 0, slot: 3 },
    ];
  }
  if (layoutId === 'bleed') {
    return [{ x: 0, y: 0, w, h, rot: 0, slot: 0 }];
  }
  if (layoutId === 'tilted') {
    const cardW = w * 0.4;
    const cardH = h * 0.58;
    const centres = [
      { cx: w * 0.24, rot: -0.085 },
      { cx: w * 0.5, rot: 0.028 },
      { cx: w * 0.76, rot: 0.075 },
    ];
    return centres.map((centre, index) => ({
      x: centre.cx - cardW / 2,
      y: h * 0.055,
      w: cardW,
      h: cardH,
      rot: centre.rot,
      slot: index,
    }));
  }
  // Hero: one wide panel on top, three across the bottom.
  const heroH = h * 0.585;
  const stripY = heroH + gap;
  const stripH = h - stripY;
  const cellW = (w - gap * 2) / 3;
  return [
    { x: 0, y: 0, w, h: heroH, rot: 0, slot: 0 },
    { x: 0, y: stripY, w: cellW, h: stripH, rot: 0, slot: 1 },
    { x: cellW + gap, y: stripY, w: cellW, h: stripH, rot: 0, slot: 2 },
    { x: (cellW + gap) * 2, y: stripY, w: cellW, h: stripH, rot: 0, slot: 3 },
  ];
}

// Draw one photo into a rectangle, covering it edge to edge. `crop` holds
// the panel's zoom (1 and up) and pan (-0.5 to 0.5 of the overflow), so the
// photo can be reframed without ever leaving a gap at the edges.
export function drawPhoto(ctx, img, rect, crop) {
  if (!img || !img.naturalWidth || !img.naturalHeight) {
    paintEmptyPanel(ctx, rect);
    return;
  }
  const zoom = Math.max(1, crop && crop.zoom ? crop.zoom : 1);
  const panX = clamp(crop && crop.panX ? crop.panX : 0, -0.5, 0.5);
  const panY = clamp(crop && crop.panY ? crop.panY : 0, -0.5, 0.5);
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const overX = Math.max(0, drawW - rect.w);
  const overY = Math.max(0, drawH - rect.h);
  const dx = rect.x + (rect.w - drawW) / 2 + panX * overX;
  const dy = rect.y + (rect.h - drawH) / 2 + panY * overY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();
}

function paintEmptyPanel(ctx, rect) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wash.addColorStop(0, '#3a1b58');
  wash.addColorStop(1, '#1d0b2e');
  ctx.save();
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Colour work per grade: a canvas filter applied while the photos are
// drawn, then a translucent wash laid over the whole cover.
function gradeFilter(gradeId) {
  switch (gradeId) {
    case 'neon':
      return 'saturate(1.35) contrast(1.07) brightness(1.0)';
    case 'noir':
      return 'saturate(0.45) contrast(1.14) brightness(0.88)';
    case 'pastel':
      return 'saturate(0.8) brightness(1.1) contrast(0.95)';
    default:
      return 'saturate(1.16) contrast(1.05) brightness(1.02)';
  }
}

function gradeWashes(ctx, gradeId, w, h) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  if (gradeId === 'neon') {
    wash.addColorStop(0, 'rgba(255, 0, 140, 0.20)');
    wash.addColorStop(1, 'rgba(0, 200, 255, 0.16)');
  } else if (gradeId === 'noir') {
    wash.addColorStop(0, 'rgba(8, 8, 28, 0.22)');
    wash.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
  } else if (gradeId === 'pastel') {
    wash.addColorStop(0, 'rgba(255, 180, 220, 0.16)');
    wash.addColorStop(1, 'rgba(140, 220, 255, 0.12)');
  } else {
    wash.addColorStop(0, 'rgba(255, 120, 40, 0.14)');
    wash.addColorStop(1, 'rgba(255, 40, 110, 0.20)');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

const TITLE_FONT = "Anton, 'Arial Narrow', sans-serif";

// Shrink a line of type until it fits its target width. Returns the size
// actually used, with the font already set on the context. `spacingFactor`
// is the letter spacing as a fraction of the size, re-applied at each step
// so the measurement includes it.
function fitSize(ctx, text, family, startPx, maxWidth, spacingFactor) {
  let size = startPx;
  const setFont = () => {
    ctx.font = `${size}px ${family}`;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = `${Math.round(size * spacingFactor)}px`;
  };
  setFont();
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    setFont();
  }
  return size;
}

function outlinedText(ctx, text, x, y, fillStyle, strokeStyle, lineWidth) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
}

// The caption block: a big gradient title with a dark outline and a pink
// glow, a letterspaced subtitle, and a wide-tracked tagline near the
// bottom edge. Positions are fractions of the cover so every export size
// letters the same way.
function drawCaption(ctx, state, w, h, layoutId) {
  const title = (state.title || '').trim().toUpperCase() || 'VICE NIGHTS';
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim().toUpperCase();
  const small = Math.min(w, h);
  const centreX = w / 2;
  const titleBaseline =
    layoutId === 'bleed' ? h * 0.82 : layoutId === 'tilted' ? h * 0.8 : layoutId === 'grid' ? h * 0.84 : h * 0.865;
  const titleMax = layoutId === 'bleed' ? w * 0.84 : layoutId === 'grid' ? w * 0.8 : w * 0.76;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleSize = fitSize(ctx, title, TITLE_FONT, Math.round(small * 0.26), titleMax, 0);
  const gradient = ctx.createLinearGradient(0, titleBaseline - titleSize, 0, titleBaseline);
  gradient.addColorStop(0, '#fff6cf');
  gradient.addColorStop(0.55, '#ffc46b');
  gradient.addColorStop(1, '#ff6a5e');
  ctx.shadowColor = 'rgba(255, 30, 120, 0.5)';
  ctx.shadowBlur = titleSize * 0.16;
  ctx.shadowOffsetY = titleSize * 0.015;
  outlinedText(ctx, title, centreX, titleBaseline, gradient, '#22060f', titleSize * 0.09);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (subtitle) {
    const subSize = fitSize(ctx, subtitle, TITLE_FONT, Math.round(small * 0.05), w * 0.46, 0.32);
    outlinedText(ctx, subtitle, centreX, titleBaseline + Math.round(small * 0.055), '#ffffff', '#22060f', Math.max(2, subSize * 0.07));
  }
  if (tagline) {
    const tagSize = fitSize(ctx, tagline, TITLE_FONT, Math.round(small * 0.03), w * 0.52, 0.55);
    outlinedText(ctx, tagline, centreX, h * 0.96, '#ffffff', '#22060f', Math.max(1.5, tagSize * 0.06));
  }
  if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = '0px';
  ctx.restore();
}

// A tilted snapshot card: a white frame, a soft drop shadow, and the photo
// inside, drawn in a rotated frame so the card leans like a print tossed
// on the cover.
function drawTiltedCard(ctx, photo, rect, filter) {
  const border = Math.max(6, Math.round(rect.w * 0.035));
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rect.rot);
  ctx.shadowColor = 'rgba(10, 0, 16, 0.45)';
  ctx.shadowBlur = Math.round(rect.w * 0.06);
  ctx.shadowOffsetY = Math.round(rect.h * 0.02);
  ctx.fillStyle = '#f6efe6';
  ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const inner = {
    x: -rect.w / 2 + border,
    y: -rect.h / 2 + border,
    w: rect.w - border * 2,
    h: rect.h - border * 3,
  };
  ctx.save();
  ctx.filter = filter;
  drawPhoto(ctx, photo ? photo.img : null, inner, photo);
  ctx.restore();
  ctx.restore();
}

let grainTile = null;

// A small seeded-noise tile, the same on every render, so the grain never
// shimmers between the preview and the export.
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tileCtx = tile.getContext('2d');
  const data = tileCtx.createImageData(140, 140);
  let seed = 20261120;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = 118 + Math.floor((seed / 4294967296) * 22);
    data.data[i] = value;
    data.data[i + 1] = value;
    data.data[i + 2] = value;
    data.data[i + 3] = 255;
  }
  tileCtx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

function finishCover(ctx, w, h) {
  const vignette = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, 'rgba(16, 2, 24, 0)');
  vignette.addColorStop(1, 'rgba(16, 2, 24, 0.38)');
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.055;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Paint the whole cover: backdrop, panels, grade, caption, vignette and
// grain. `state` is { layout, grade, title, subtitle, tagline, photos },
// where photos is an array of { img, zoom, panX, panY } slots.
export function drawCover(ctx, state, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  if (state.layout === 'tilted') {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b0f3c');
    sky.addColorStop(0.55, '#c22a6b');
    sky.addColorStop(1, '#ff7a3d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#e9b6c6';
    ctx.fillRect(0, 0, w, h);
  }
  const rects = panelRects(state.layout, w, h);
  const filter = gradeFilter(state.grade);
  for (const rect of rects) {
    const photo = state.photos ? state.photos[rect.slot] : null;
    if (rect.rot) {
      drawTiltedCard(ctx, photo, rect, filter);
    } else {
      ctx.save();
      ctx.filter = filter;
      drawPhoto(ctx, photo ? photo.img : null, rect, photo);
      ctx.restore();
    }
  }
  ctx.filter = 'none';
  gradeWashes(ctx, state.grade, w, h);
  drawCaption(ctx, state, w, h, state.layout);
  finishCover(ctx, w, h);
  ctx.restore();
}
