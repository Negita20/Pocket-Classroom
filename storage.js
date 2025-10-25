// storage.js
import { slugify } from './utils.js';
const IDX_KEY = 'pc_capsules_index';

function readRaw(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (e) {
    return null;
  }
}
function writeRaw(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function listIndex() {
  return readRaw(IDX_KEY) || [];
}

export function saveIndex(indexArr) {
  writeRaw(IDX_KEY, indexArr);
}

export function saveCapsule(id, capsule) {
  writeRaw(`pc_capsule_${id}`, capsule);
  // ensure index entry exists/updated
  const idx = listIndex();
  const exist = idx.find(i => i.id === id);
  const entry = { id, title: capsule.meta.title, subject: capsule.meta.subject || '', level: capsule.meta.level || '', updatedAt: capsule.meta.updatedAt || new Date().toISOString() };
  if (exist) {
    const newIdx = idx.map(i => i.id === id ? entry : i);
    saveIndex(newIdx);
  } else {
    idx.unshift(entry);
    saveIndex(idx);
  }
}

export function loadCapsule(id) {
  return readRaw(`pc_capsule_${id}`);
}

export function deleteCapsule(id) {
  localStorage.removeItem(`pc_capsule_${id}`);
  const idx = listIndex().filter(i => i.id !== id);
  saveIndex(idx);
  localStorage.removeItem(`pc_progress_${id}`);
}

export function generateId(title='capsule') {
  const base = slugify(title || 'capsule');
  // ensure unique
  let id = base;
  let i = 1;
  const idx = listIndex();
  while (idx.some(e => e.id === id)) {
    id = `${base}-${i++}`;
  }
  return id;
}

export function saveProgress(id, progress) {
  writeRaw(`pc_progress_${id}`, progress);
}

export function loadProgress(id) {
  return readRaw(`pc_progress_${id}`) || { bestScore: 0, knownFlashcards: [] };
}
