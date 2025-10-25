// learn.js
import { listIndex, loadCapsule, loadProgress, saveProgress } from './storage.js';
import { timeAgo, escapeHTML } from './utils.js';

let currentId = null;
let capsule = null;
let progress = null;

/* Notes */
function renderNotes() {
  const list = document.getElementById('notesList');
  const notes = capsule.notes || [];
  const q = document.getElementById('notesSearch').value.trim().toLowerCase();
  list.innerHTML = '';
  const filtered = notes.filter(n => n.toLowerCase().includes(q));
  filtered.forEach(n => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = escapeHTML(n);
    list.appendChild(li);
  });
  document.getElementById('notesCount').textContent = `${filtered.length}/${notes.length}`;
}

/* Flashcards */
let fcIndex = 0;
function renderFlashcard() {
  const shell = document.getElementById('flashcardShell');
  shell.innerHTML = '';
  const fcs = capsule.flashcards || [];
  if (!fcs.length) {
    shell.innerHTML = `<div class="text-muted">No flashcards.</div>`;
    document.getElementById('fcCounters').textContent = '';
    return;
  }
  const f = fcs[fcIndex % fcs.length];
  const inner = document.createElement('div');
  inner.className = 'flashcard';
  inner.innerHTML = `
    <div class="card-inner" id="cardInner">
      <div class="card-face card-front"><div>${escapeHTML(f.front)}</div></div>
      <div class="card-face card-back"><div>${escapeHTML(f.back)}</div></div>
    </div>`;
  shell.appendChild(inner);

  const cardInner = document.getElementById('cardInner');
  inner.onclick = () => cardInner.classList.toggle('is-flipped');

  const knownCount = (progress.knownFlashcards || []).length;
  document.getElementById('fcCounters').textContent = `Card ${fcIndex+1}/${fcs.length} • Known ${knownCount}`;
}

function fcNext() { fcIndex = Math.min(fcIndex + 1, (capsule.flashcards||[]).length - 1); renderFlashcard(); }
function fcPrev() { fcIndex = Math.max(fcIndex - 1, 0); renderFlashcard(); }
function fcMarkKnown() {
  const known = new Set(progress.knownFlashcards || []);
  known.add(fcIndex);
  progress.knownFlashcards = Array.from(known).sort((a,b)=>a-b);
  saveProgress(currentId, progress);
  renderFlashcard();
}
function fcMarkUnknown() {
  const known = new Set(progress.knownFlashcards || []);
  known.delete(fcIndex);
  progress.knownFlashcards = Array.from(known).sort((a,b)=>a-b);
  saveProgress(currentId, progress);
  renderFlashcard();
}

/* Quiz */
let quizIndex = 0;
let quizScore = 0;
function renderQuizScreen() {
  const shell = document.getElementById('quizShell');
  const quiz = capsule.quiz || [];
  if (!quiz.length) { shell.innerHTML = '<div class="text-muted">No quiz questions.</div>'; return; }
  if (quizIndex >= quiz.length) {
    const pct = Math.round(quizScore / quiz.length * 100);
    const prevBest = progress.bestScore || 0;
    if (pct > prevBest) {
      progress.bestScore = pct;
      saveProgress(currentId, progress);
    }
    document.getElementById('quizResult').classList.remove('d-none');
    document.getElementById('quizResult').innerHTML = `<div class="alert alert-info">Score: ${pct}% (best: ${progress.bestScore}%)</div>`;
    shell.innerHTML = '';
    return;
  }
  const q = quiz[quizIndex];
  shell.innerHTML = `
    <div class="card p-3">
      <h5>Q${quizIndex+1}. ${escapeHTML(q.q)}</h5>
      <div class="mt-2 d-grid gap-2" id="quizChoices"></div>
    </div>`;
  const choicesDiv = document.getElementById('quizChoices');
  q.choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'btn btn-outline-primary';
    b.textContent = `${String.fromCharCode(65+i)}. ${c}`;
    b.onclick = () => {
      const correct = (i === q.answerIndex);
      if (correct) quizScore++;
      // brief feedback then next
      b.classList.add(correct ? 'btn-success' : 'btn-danger');
      setTimeout(() => { quizIndex++; renderQuizScreen(); }, 600);
    };
    choicesDiv.appendChild(b);
  });
}

/* Core */
export function initLearn() {
  // capsule select
  const sel = document.getElementById('capsuleSelect');
  sel.onchange = () => {
    const id = sel.value;
    if (!id) return;
    openCapsule(id);
  };
  document.getElementById('btnExport').onclick = () => {
    const c = capsule;
    if (!c) return alert('No capsule selected');
    const text = JSON.stringify(c,null,2);
    window.dispatchEvent(new CustomEvent('pc:export',{detail:{text, filename: (c.meta.title||c.id)+'.json'}}));
  };

  // tab switching
  document.getElementById('learnTabs').addEventListener('click', e => {
    if (e.target.dataset.tab) showTab(e.target.dataset.tab);
  });

  // notes search
  document.getElementById('notesSearch').oninput = () => renderNotes();

  // flashcard buttons
  document.getElementById('fcNext').onclick = fcNext;
  document.getElementById('fcPrev').onclick = fcPrev;
  document.getElementById('fcKnown').onclick = fcMarkKnown;
  document.getElementById('fcUnknown').onclick = fcMarkUnknown;

  // keyboard flip (space)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const cardInner = document.querySelector('.card-inner');
      if (cardInner) { cardInner.classList.toggle('is-flipped'); e.preventDefault(); }
    }
  });

  // listen for open
  window.addEventListener('pc:open-learn', e => {
    openCapsule(e.detail.id);
  });

  refreshCapsuleSelect();
}

export function refreshCapsuleSelect() {
  const sel = document.getElementById('capsuleSelect');
  sel.innerHTML = '<option value="">-- choose capsule --</option>';
  listIndex().forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.id; opt.textContent = `${i.title} (${i.level})`;
    sel.appendChild(opt);
  });
}

function openCapsule(id) {
  currentId = id;
  capsule = loadCapsule(id);
  progress = loadProgress(id);
  if (!capsule) { alert('Capsule not found'); return; }
  document.getElementById('learnMeta').innerHTML = `<h4>${escapeHTML(capsule.meta.title)}</h4><div class="text-muted">${escapeHTML(capsule.meta.subject || '')} • ${escapeHTML(capsule.meta.level)} • ${timeAgo(capsule.meta.updatedAt)}</div>`;
  // default to notes tab
  showTab('notes');
  // render select to show chosen
  document.getElementById('capsuleSelect').value = id;
}

function showTab(tab) {
  document.querySelectorAll('#learnTabs .nav-link').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
  document.querySelectorAll('.tabView').forEach(v => v.classList.add('d-none'));
  document.getElementById(`${tab}View`).classList.remove('d-none');

  // run render for each tab
  if (tab === 'notes') renderNotes();
  if (tab === 'flashcards') { fcIndex = 0; renderFlashcard(); }
  if (tab === 'quiz') { quizIndex = 0; quizScore = 0; document.getElementById('quizResult').classList.add('d-none'); renderQuizScreen(); }
}
