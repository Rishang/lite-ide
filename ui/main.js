import {getTree, readFile, writeFile} from './client.js';

const store = {
  tree: [],
  tabs: new Map(),         // path -> {content,dirty}
  active: null
};

await refreshTree();
initKeys();

document.getElementById('editor').addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (store.active) {
      await writeFile(store.active, store.tabs.get(store.active).content);
      markClean(store.active);
    }
  }
});

async function refreshTree () {
  store.tree = await getTree();
  renderExplorer();
}

function renderExplorer() {
  const list = document.getElementById('explorer');
  list.innerHTML = `
    <b class='label'>Files</b>
    <ul>${recurse(store.tree)}</ul>
  `;
  list.querySelectorAll('li[data-path]').forEach(li => li.onclick = openFileClient);
}

function recurse(arr) {
  return arr.map(n => n.type === 'folder'
      ? `<li><b>${n.name}</b><ul>${recurse(n.children||[])}</ul></li>`
      : `<li data-path="${n.path}">${n.name}</li>`).join('');
}

async function openFileClient({target}) {
  const path = target.dataset.path;
  if (!path) return;
  const content = await readFile(path);
  store.tabs.set(path, {content, dirty: false});
  store.active = path;
  renderTabs();
  initEditor(content, path);
}

function markClean(path) {
  if (!store.tabs.has(path)) return;
  store.tabs.get(path).dirty = false;
}

function renderTabs () {
  const bar = document.getElementById('tab-bar');
  bar.innerHTML = [...store.tabs.keys()]
    .map(p => `<span class="tab ${p===store.active?'active':''}" data-target="${p}">${p.split('/').pop()}${store.tabs.get(p).dirty?' *':''}<button>X</button></span>`).join('');
  bar.onclick = e => {
    if (e.target.tagName === 'BUTTON') closeTab(e.target.closest('span').dataset.target);
    else if (e.target.classList.contains('tab')) selectTab(e.target.dataset.target);
  };
}

function selectTab(path) {
  if (!store.tabs.has(path)) return;
  store.active = path;
  initEditor(store.tabs.get(path).content, path);
  renderTabs();
}

function closeTab(path) {
  store.tabs.delete(path);
  if (store.active === path) store.active = null;
  renderTabs();
}

let editor;
function initEditor(content, path) {
  if (!editor) {
    editor = monaco.editor.create(document.getElementById('editor'), {
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: {enabled:false}
    });
  }
  const ext = (path.split('.').pop() || 'txt').toLowerCase();
  monaco.editor.setModelLanguage(editor.getModel(), ext);
  editor.setValue(content);
  editor.onDidChangeModelContent(() => {
    store.tabs.get(store.active).content = editor.getValue();
    store.tabs.get(store.active).dirty = true;
    renderTabs();
  });
}

function initKeys() {
  // other global shortcuts can live here
} 