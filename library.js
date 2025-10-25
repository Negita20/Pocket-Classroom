// library.js
import { listIndex, loadCapsule, deleteCapsule } from './storage.js';
import { timeAgo } from './utils.js';

const $grid = () => document.getElementById('libraryGrid');
const $empty = () => document.getElementById('libraryEmpty');

export function initLibrary() {
  render();
  // top buttons wired in main.js
}

function render() {
  const idx = listIndex();
  const grid = $grid();
  grid.innerHTML = '';
  if (!idx.length) {
    $empty().classList.remove('d-none');
    return;
  } else {
    $empty().classList.add('d-none');
  }

  idx.forEach(entry => {
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `
      <div class="card h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-start">
            <h5 class="card-title mb-0 me-2">${entry.title}</h5>
            <span class="badge bg-info text-dark ms-auto">${entry.level}</span>
          </div>
          <p class="card-text small text-muted mb-2">${entry.subject || ''}</p>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <small class="text-muted">${timeAgo(entry.updatedAt)}</small>
            <div>
              <button class="btn btn-sm btn-outline-success me-1 btnLearn" data-id="${entry.id}">Learn</button>
              <button class="btn btn-sm btn-outline-secondary me-1 btnEdit" data-id="${entry.id}">Edit</button>
              <button class="btn btn-sm btn-outline-primary me-1 btnExport" data-id="${entry.id}">Export</button>
              <button class="btn btn-sm btn-outline-danger btnDelete" data-id="${entry.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>`;
    grid.appendChild(col);
  });

  // event delegation
  grid.querySelectorAll('.btnLearn').forEach(b => b.onclick = e => {
    const id = e.currentTarget.dataset.id;
    const ev = new CustomEvent('pc:navigate', {detail:{to:'learn', id}});
    window.dispatchEvent(ev);
  });
  grid.querySelectorAll('.btnEdit').forEach(b => b.onclick = e => {
    const id = e.currentTarget.dataset.id;
    const ev = new CustomEvent('pc:navigate', {detail:{to:'author', id}});
    window.dispatchEvent(ev);
  });
  grid.querySelectorAll('.btnExport').forEach(async b => {
    b.onclick = async e => {
      const id = e.currentTarget.dataset.id;
      const c = loadCapsule(id);
      if (!c) return alert('Capsule not found');
      const text = JSON.stringify(c, null, 2);
      const filename = (c.meta && c.meta.title ? c.meta.title : id).replace(/\s+/g,'-') + '.json';
      const ev = new CustomEvent('pc:export', {detail:{text, filename}});
      window.dispatchEvent(ev);
    };
  });
  grid.querySelectorAll('.btnDelete').forEach(b => {
    b.onclick = e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm('Delete this capsule?')) return;
      deleteCapsule(id);
      render();
    };
  });
}

export function refreshLibrary() { render(); }
