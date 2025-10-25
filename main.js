
import { initLibrary, refreshLibrary } from './library.js';
import { initAuthor, openForEdit } from './author.js';
import { initLearn, refreshCapsuleSelect } from './learn.js';
import { loadCapsule } from './storage.js';
import { downloadBlob } from './utils.js';


initLibrary();
initAuthor();
initLearn();


function showView(name) {
  ['library','author','learn'].forEach(n => {
    const el = document.getElementById(n + 'Section');
    if (!el) return;
    if (n === name) el.classList.remove('d-none'); else el.classList.add('d-none');
  });
}


document.querySelectorAll('[data-route]').forEach(b => b.onclick = () => {
  const to = b.dataset.route;
  navigate(to);
});

function navigate(to, id=null) {
  showView(to);
  if (to === 'library') {
  
    refreshLibrary();
  } else if (to === 'author') {
  
    window.dispatchEvent(new CustomEvent('pc:open-author',{detail:{id, newCapsule: !id}}));
   
  } else if (to === 'learn') {
    if (id) window.dispatchEvent(new CustomEvent('pc:open-learn',{detail:{id}}));
  }
}
document.getElementById('btnNew').onclick = () => navigate('author', null);
document.getElementById('fileImport').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const txt = await f.text();
  try {
    const obj = JSON.parse(txt);
    if (obj.schema !== 'pocket-classroom/v1' || !obj.meta || !obj.meta.title) throw new Error('Invalid schema');
    obj.id = null; 
    window.dispatchEvent(new CustomEvent('pc:open-author',{detail:{id:null}}));
    const id = (obj.id) || (obj.meta && obj.meta.title ? obj.meta.title.replace(/\s+/g,'-').toLowerCase() : 'imported') + '-' + Date.now();
    obj.id = id;
    localStorage.setItem(`pc_capsule_${id}`, JSON.stringify(obj));
    const idx = JSON.parse(localStorage.getItem('pc_capsules_index') || '[]');
    idx.unshift({ id, title: obj.meta.title, subject: obj.meta.subject || '', level: obj.meta.level || '', updatedAt: obj.meta.updatedAt || new Date().toISOString() });
    localStorage.setItem('pc_capsules_index', JSON.stringify(idx));
    alert('Imported.');
    refreshLibrary();
    refreshCapsuleSelect();
  } catch (err) {
    alert('Import failed: ' + err.message);
  } finally {
    e.target.value = '';
  }
};

window.addEventListener('pc:navigate', e => {
  navigate(e.detail.to, e.detail.id);
});
window.addEventListener('pc:library-refresh', () => { refreshLibrary(); refreshCapsuleSelect(); });
window.addEventListener('pc:export', (e) => {
  const { text, filename } = e.detail;
  downloadBlob(filename || 'capsule.json', text);
});


navigate('library');
