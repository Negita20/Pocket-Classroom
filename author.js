// author.js
import { saveCapsule, loadCapsule, generateId } from './storage.js';
import { debounce, escapeHTML } from './utils.js';

const ids = {
  title: 'metaTitle', subject: 'metaSubject', level: 'metaLevel', desc: 'metaDesc',
  notes: 'notesEditor', flashcards: 'flashcardsEditor', quiz: 'quizEditor'
};

let currentId = null;
let draft = null;

export function initAuthor() {
  // wire buttons
  document.getElementById('btnAddFlashcard').onclick = () => addFlashcardRow();
  document.getElementById('btnAddQuestion').onclick = () => addQuestionBlock();
  document.getElementById('btnSaveCapsule').onclick = saveHandler;
  document.getElementById('btnCancelAuthor').onclick = () => window.dispatchEvent(new CustomEvent('pc:navigate',{detail:{to:'library'}}));
  document.getElementById('notesEditor').oninput = debounce(() => saveDraft(), 600);

  // auto-save other inputs debounce
  ['metaTitle','metaSubject','metaLevel','metaDesc'].forEach(id => {
    const el = document.getElementById(id);
    el.oninput = debounce(() => saveDraft(), 600);
  });

  // listen for open events
  window.addEventListener('pc:open-author', (e) => {
    openForEdit(e.detail);
  });
}

export function openForEdit({ id=null, newCapsule=false }) {
  currentId = id;
  // if editing existing load, else prepare blank
  if (id) {
    const capsule = loadCapsule(id);
    if (!capsule) {
      alert('Capsule not found');
      return;
    }
    draft = capsule;
  } else {
    draft = {
      schema: "pocket-classroom/v1",
      id: null,
      meta: { title: '', subject: '', level: 'Beginner', desc: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      notes: [],
      flashcards: [],
      quiz: [],
      resources: []
    };
  }
  renderForm();
}

function renderForm() {
  const m = draft.meta;
  document.getElementById(ids.title).value = m.title || '';
  document.getElementById(ids.subject).value = m.subject || '';
  document.getElementById(ids.level).value = m.level || 'Beginner';
  document.getElementById(ids.desc).value = m.desc || '';
  document.getElementById(ids.notes).value = (draft.notes || []).join('\n');

  // flashcards
  const fc = document.getElementById(ids.flashcards);
  fc.innerHTML = '';
  (draft.flashcards || []).forEach(f => addFlashcardRow(f.front, f.back));
  // quiz
  const q = document.getElementById(ids.quiz);
  q.innerHTML = '';
  (draft.quiz || []).forEach(qu => addQuestionBlock(qu));
}

export function addFlashcardRow(front='', back='') {
  const row = document.createElement('div');
  row.className = 'row g-2 align-items-end fc-row';
  row.innerHTML = `
    <div class="col">
      <label class="form-label">Front</label>
      <input class="form-control fc-front" value="${escapeHTML(front)}">
    </div>
    <div class="col">
      <label class="form-label">Back</label>
      <input class="form-control fc-back" value="${escapeHTML(back)}">
    </div>
    <div class="col-auto">
      <button class="btn btn-outline-danger btnDel">✕</button>
    </div>`;
  row.querySelector('.btnDel').onclick = () => row.remove();
  document.getElementById('flashcardsEditor').appendChild(row);
}

function addQuestionBlock(obj) {
  const jq = obj || { q: '', choices: ['', '','',''], answerIndex: 0, explain: '' };
  const wrapper = document.createElement('div');
  wrapper.className = 'p-2 mb-2 border rounded';
  wrapper.innerHTML = `
    <div class="mb-2">
      <label class="form-label">Question</label>
      <input class="form-control q-text" value="${escapeHTML(jq.q)}">
    </div>
    <div class="row g-2">
      <div class="col-6"><label class="form-label">A</label><input class="form-control q-choice" data-i="0" value="${escapeHTML(jq.choices[0])}"></div>
      <div class="col-6"><label class="form-label">B</label><input class="form-control q-choice" data-i="1" value="${escapeHTML(jq.choices[1])}"></div>
      <div class="col-6"><label class="form-label">C</label><input class="form-control q-choice" data-i="2" value="${escapeHTML(jq.choices[2])}"></div>
      <div class="col-6"><label class="form-label">D</label><input class="form-control q-choice" data-i="3" value="${escapeHTML(jq.choices[3])}"></div>
    </div>
    <div class="d-flex align-items-center mt-2">
      <label class="form-label me-2">Correct</label>
      <select class="form-select w-auto q-answer">
        <option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option>
      </select>
      <button class="btn btn-outline-danger btn-sm ms-auto btnDelQ">Delete</button>
    </div>
    <div class="mt-2">
      <label class="form-label">Explanation (optional)</label>
      <input class="form-control q-explain" value="${escapeHTML(jq.explain)}">
    </div>
  `;
  wrapper.querySelector('.q-answer').value = String(jq.answerIndex || 0);
  wrapper.querySelector('.btnDelQ').onclick = () => wrapper.remove();
  document.getElementById('quizEditor').appendChild(wrapper);
}

function collectFromForm() {
  const meta = {
    title: document.getElementById(ids.title).value.trim(),
    subject: document.getElementById(ids.subject).value.trim(),
    level: document.getElementById(ids.level).value,
    desc: document.getElementById(ids.desc).value.trim(),
    createdAt: draft.meta.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const notes = document.getElementById(ids.notes).value.split('\n').map(s => s.trim()).filter(Boolean);

  const flashcards = Array.from(document.querySelectorAll('#flashcardsEditor .fc-row')).map(r => {
    const front = r.querySelector('.fc-front').value.trim();
    const back = r.querySelector('.fc-back').value.trim();
    return { front, back };
  }).filter(f => f.front || f.back);

  const quiz = Array.from(document.querySelectorAll('#quizEditor .p-2')).map(p => {
    const q = p.querySelector('.q-text').value.trim();
    const choices = Array.from(p.querySelectorAll('.q-choice')).map(c => c.value.trim());
    const answerIndex = parseInt(p.querySelector('.q-answer').value || '0', 10);
    const explain = p.querySelector('.q-explain').value.trim();
    return { q, choices, answerIndex, explain };
  }).filter(q => q.q && q.choices.some(c => c));

  return { meta, notes, flashcards, quiz };
}

function saveHandler() {
  const { meta, notes, flashcards, quiz } = collectFromForm();
  if (!meta.title) return alert('Title is required.');
  if (!notes.length && !flashcards.length && !quiz.length) return alert('Add at least notes, flashcards, or quiz.');

  const id = currentId || generateId(meta.title);
  const capsule = {
    schema: "pocket-classroom/v1",
    id,
    meta,
    notes,
    flashcards,
    quiz,
    resources: []
  };
  saveCapsule(id, capsule);
  currentId = id;
  alert('Saved.');
  window.dispatchEvent(new CustomEvent('pc:navigate',{detail:{to:'library'}}));
  // also signal refresh
  window.dispatchEvent(new CustomEvent('pc:library-refresh'));
}

function saveDraft() {
  // simple local draft - not fully persisted as capsule until Save
  // we could store in localStorage if needed
}

