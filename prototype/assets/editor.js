// ============================================================
// Editor – canvas-liknande drag-and-drop med inline-redigering
// + simulerad AI-assistent
//
// Kärnprincip: design = JSON-blockträd. HTML genereras vid preview.
// Tre funktioner:
//   1. Dra block från paletten OCH flytta befintliga block (omordna)
//   2. Inline-redigering direkt på canvasen + egenskapspanel
//   3. Simulerad AI för rubrik/text/design
// ============================================================

// Block-palett (vänsterpanel)
const BLOCK_PALETTE = [
  { type: 'heading', label: 'Rubrik', icon: 'H' },
  { type: 'text', label: 'Text', icon: '¶' },
  { type: 'image', label: 'Bild', icon: '▣' },
  { type: 'button', label: 'Knapp', icon: '▭' },
  { type: 'article-card', label: 'Artikelkort', icon: '▤' },
  { type: 'cta', label: 'CTA-sektion', icon: '★' },
  { type: 'dynamic', label: 'Dynamiskt block', icon: '⚡' },
  { type: 'divider', label: 'Avdelare', icon: '—' },
  { type: 'footer', label: 'Footer', icon: '▁' },
];

// Editor-tillstånd
let editorTree = null;
let selectedBlockId = null;   // vilket block som är markerat (för egenskapspanel)

function defaultBlock(type) {
  const id = 'b_' + Math.random().toString(36).slice(2, 7);
  const defs = {
    heading: { id, type, text: 'Ny rubrik' },
    text: { id, type, text: 'Skriv din text här. Klicka för att redigera.' },
    image: { id, type, alt: 'Bild', placeholder: true, width: 600 },
    button: { id, type, text: 'Klicka här', url: 'https://example.se' },
    'article-card': { id, type, title: 'Artikelrubrik', desc: 'Kort beskrivning av artikeln.', cta: 'Läs mer', label: 'Lokalt', url: 'https://example.se' },
    cta: { id, type, text: 'Bli prenumerant idag', url: 'https://example.se' },
    dynamic: { id, type, segment: 'Icke-betalande', fallback: 'Standardinnehåll' },
    divider: { id, type },
    footer: { id, type, text: 'Du får detta mejl för att du prenumererar.', unsubscribe: true },
  };
  return defs[type] || { id, type };
}

// ---------- Hitta block + dess kolumn i trädet ----------
function findBlock(blockId) {
  for (const section of editorTree.sections) {
    for (const row of section.rows) {
      for (const col of row.columns) {
        const idx = col.blocks.findIndex(b => b.id === blockId);
        if (idx !== -1) return { block: col.blocks[idx], col, idx };
      }
    }
  }
  return null;
}

function editorView(c) {
  if (!editorTree) {
    editorTree = JSON.parse(JSON.stringify(DATA.app.sampleLayout));
  }

  c.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <button onclick="navigate('campaigns')" class="text-brand text-sm">← Tillbaka</button>
        <h1 class="text-2xl font-bold">Kreativ editor</h1>
        <p class="text-slate-500 text-sm">Dra block från vänster, eller dra befintliga block för att byta plats. Klicka på ett block för att redigera.</p>
      </div>
      <div class="flex gap-2">
        <button onclick="togglePreview()" id="preview-btn" class="border border-slate-300 px-3 py-2 rounded-lg text-sm">Förhandsgranska HTML</button>
        <button onclick="toggleJson()" class="border border-slate-300 px-3 py-2 rounded-lg text-sm">Visa JSON</button>
        <button onclick="openConfirm('camp_204')" class="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium">Skicka test / fortsätt</button>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Block-palett -->
      <div class="col-span-2">
        <div class="bg-white rounded-xl border border-slate-200 p-3 sticky top-4">
          <div class="text-xs text-slate-400 mb-2 font-semibold uppercase">Lägg till block</div>
          <div class="space-y-1">
            ${BLOCK_PALETTE.map(b => `
              <div draggable="true" ondragstart="paletteDragStart(event,'${b.type}')"
                class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-brand text-sm bg-slate-50">
                <span class="w-5 text-center text-slate-400">${b.icon}</span>${b.label}
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Canvas -->
      <div class="col-span-7">
        <div id="canvas" class="bg-slate-200 rounded-xl p-6 min-h-[600px]">
          <div class="bg-white mx-auto shadow-sm" style="max-width:600px" id="email-canvas"></div>
        </div>
      </div>

      <!-- Inspektor (egenskapspanel + AI) -->
      <div class="col-span-3">
        <div id="inspector" class="sticky top-4 space-y-4"></div>
      </div>
    </div>

    <!-- Preview/JSON-paneler -->
    <div id="preview-panel" class="hidden mt-4"></div>
    <div id="json-panel" class="hidden mt-4"></div>
  `;

  renderCanvas();
  renderInspector();
}

// ============================================================
// DRAG & DROP
// Två källor: paletten (nytt block) och befintligt block (flytta).
// dragPayload håller reda på vad som dras.
// ============================================================
let dragPayload = null; // { kind:'new', type } | { kind:'move', blockId }

function paletteDragStart(e, type) {
  dragPayload = { kind: 'new', type };
  e.dataTransfer.effectAllowed = 'copy';
}
function blockDragStart(e, blockId) {
  dragPayload = { kind: 'move', blockId };
  e.dataTransfer.effectAllowed = 'move';
  e.stopPropagation();
}

// Släpp på en kolumn, ev. vid ett visst index (före ett block)
function handleDrop(col, beforeIndex) {
  if (!dragPayload) return;

  if (dragPayload.kind === 'new') {
    const nb = defaultBlock(dragPayload.type);
    if (beforeIndex == null) col.blocks.push(nb);
    else col.blocks.splice(beforeIndex, 0, nb);
    selectedBlockId = nb.id;
  } else if (dragPayload.kind === 'move') {
    const found = findBlock(dragPayload.blockId);
    if (found) {
      // ta bort från ursprungsplatsen
      found.col.blocks.splice(found.idx, 1);
      // justera index om vi flyttar inom samma kolumn och nedåt
      let target = beforeIndex;
      if (found.col === col && beforeIndex != null && found.idx < beforeIndex) target = beforeIndex - 1;
      if (target == null) col.blocks.push(found.block);
      else col.blocks.splice(target, 0, found.block);
      selectedBlockId = found.block.id;
    }
  }
  dragPayload = null;
  renderCanvas();
  renderInspector();
}

// ============================================================
// CANVAS-RENDERING
// ============================================================
function renderCanvas() {
  const canvas = $('#email-canvas');
  canvas.innerHTML = '';
  editorTree.sections.forEach(section => {
    const sec = el(`<div style="background:${section.background}"></div>`);
    section.rows.forEach(row => {
      const r = el(`<div class="flex" style="gap:0"></div>`);
      row.columns.forEach(col => {
        const colDiv = el(`<div style="flex:${col.width}" class="drop-zone p-1" data-col="${col.id}"></div>`);

        // tillåt släpp i slutet av kolumnen
        colDiv.addEventListener('dragover', (e) => { e.preventDefault(); colDiv.classList.add('drag-over'); });
        colDiv.addEventListener('dragleave', () => colDiv.classList.remove('drag-over'));
        colDiv.addEventListener('drop', (e) => {
          e.preventDefault(); colDiv.classList.remove('drag-over');
          handleDrop(col, null); // släpp i slutet
        });

        if (col.blocks.length === 0) {
          colDiv.appendChild(el(`<div class="text-center text-xs text-slate-300 py-6 border border-dashed border-slate-200 rounded">Släpp block här</div>`));
        } else {
          col.blocks.forEach((block, i) => {
            // droppzon ovanför varje block (för att flytta in före det)
            const gap = el(`<div class="h-2 -my-1 rounded transition-colors" data-gap></div>`);
            gap.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); gap.style.background = '#1d4ed8'; });
            gap.addEventListener('dragleave', () => { gap.style.background = 'transparent'; });
            gap.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); gap.style.background = 'transparent'; handleDrop(col, i); });
            colDiv.appendChild(gap);

            colDiv.appendChild(renderBlock(block, col));
          });
        }
        r.appendChild(colDiv);
      });
      sec.appendChild(r);
    });
    canvas.appendChild(sec);
  });
}

function renderBlock(block, col) {
  let inner = '';
  // Inline-redigerbara fält använder data-edit="fält" + contenteditable
  switch (block.type) {
    case 'heading':
      inner = `<h2 data-edit="text" contenteditable="true" class="text-xl font-bold p-2 outline-none focus:bg-blue-50">${block.text}</h2>`; break;
    case 'text':
      inner = `<p data-edit="text" contenteditable="true" class="p-2 text-slate-700 outline-none text-sm focus:bg-blue-50">${block.text}</p>`; break;
    case 'image':
      inner = `<div class="bg-slate-100 text-slate-400 text-center py-10 text-sm m-2 rounded">${block.placeholder ? '▣ Bildplatshållare' : (block.src || '▣ bild')}</div>`; break;
    case 'button':
      inner = `<div class="p-2"><span data-edit="text" contenteditable="true" class="inline-block bg-brand text-white px-4 py-2 rounded text-sm outline-none">${block.text}</span></div>`; break;
    case 'article-card':
      inner = `<div class="m-2 border border-slate-200 rounded-lg overflow-hidden">
        <div class="bg-slate-100 text-slate-400 text-center py-6 text-xs">▣ bild</div>
        <div class="p-3">${block.label ? `<span class="badge bg-brand-light text-brand" data-edit="label" contenteditable="true">${block.label}</span>` : ''}
        <div class="font-semibold mt-1 outline-none focus:bg-blue-50" data-edit="title" contenteditable="true">${block.title}</div>
        <div class="text-xs text-slate-500 outline-none focus:bg-blue-50" data-edit="desc" contenteditable="true">${block.desc}</div>
        <span class="text-brand text-xs font-medium"><span data-edit="cta" contenteditable="true" class="outline-none">${block.cta}</span> →</span></div></div>`; break;
    case 'cta':
      inner = `<div class="p-4 text-center text-white"><div data-edit="text" contenteditable="true" class="font-bold mb-2 outline-none">${block.text}</div>
        <span class="inline-block bg-white text-brand px-4 py-2 rounded text-sm font-medium">Klicka här</span></div>`; break;
    case 'dynamic':
      inner = `<div class="m-2 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg p-3 text-xs">
        <span class="badge bg-amber-100 text-amber-700">⚡ Dynamiskt block</span>
        <div class="mt-1 text-amber-700">Visas för: <b>${block.segment}</b></div>
        <div class="text-amber-600">Fallback: ${block.fallback}</div></div>`; break;
    case 'divider':
      inner = `<hr class="my-2 border-slate-200">`; break;
    case 'footer':
      inner = `<div class="p-3 text-center text-xs text-slate-400"><span data-edit="text" contenteditable="true" class="outline-none">${block.text}</span><br>
        <a class="underline">Avregistrera</a></div>`; break;
    default:
      inner = `<div class="p-2 text-xs text-slate-400">${block.type}</div>`;
  }

  const isSelected = block.id === selectedBlockId;
  const wrap = el(`<div draggable="true" class="canvas-block relative group ${isSelected ? 'ring-2 ring-brand' : ''}" data-block="${block.id}">${inner}</div>`);

  // gör hela blocket dragbart för omordning
  wrap.addEventListener('dragstart', (e) => blockDragStart(e, block.id));

  // klick markerar blocket (för egenskapspanelen) – men inte när man klickar i ett editerbart fält
  wrap.addEventListener('click', (e) => {
    if (e.target.getAttribute('contenteditable') === 'true') return;
    selectedBlockId = block.id;
    renderCanvas();
    renderInspector();
  });

  // spara inline-redigeringar tillbaka till trädet
  wrap.querySelectorAll('[data-edit]').forEach(node => {
    node.addEventListener('blur', () => {
      const field = node.getAttribute('data-edit');
      block[field] = node.innerText.trim();
    });
    // klick i fält ska inte trigga blockflytt eller markering
    node.addEventListener('mousedown', (e) => e.stopPropagation());
  });

  // dra-handtag + radera (visas vid hover)
  const tools = el(`<div class="absolute -top-3 right-1 hidden group-hover:flex gap-1"></div>`);
  const handle = el(`<span class="bg-slate-700 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center cursor-grab" title="Dra för att flytta">⠿</span>`);
  const del = el(`<button class="bg-red-500 text-white w-6 h-6 rounded-full text-xs" title="Ta bort">×</button>`);
  del.onclick = (e) => {
    e.stopPropagation();
    col.blocks = col.blocks.filter(b => b.id !== block.id);
    if (selectedBlockId === block.id) selectedBlockId = null;
    renderCanvas(); renderInspector();
  };
  tools.appendChild(handle);
  tools.appendChild(del);
  wrap.appendChild(tools);

  return wrap;
}

// ============================================================
// INSPEKTOR – egenskapspanel + AI-assistent
// ============================================================
function renderInspector() {
  const ins = $('#inspector');
  const found = selectedBlockId ? findBlock(selectedBlockId) : null;

  let propsHtml = '';
  if (found) {
    propsHtml = blockProperties(found.block);
  } else {
    propsHtml = `<div class="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-400">
      Klicka på ett block i canvasen för att redigera dess egenskaper här.</div>`;
  }

  ins.innerHTML = propsHtml + aiPanel(found ? found.block : null) + helpPanel();
  wireInspector();
}

function inputRow(label, field, value, placeholder = '') {
  return `<label class="block mb-3">
    <span class="text-xs text-slate-400">${label}</span>
    <input data-prop="${field}" value="${(value ?? '').toString().replace(/"/g, '&quot;')}" placeholder="${placeholder}"
      class="w-full mt-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-brand">
  </label>`;
}

function blockProperties(block) {
  const fields = {
    heading: () => inputRow('Rubriktext', 'text', block.text),
    text: () => inputRow('Text', 'text', block.text),
    image: () => inputRow('Bild-URL', 'src', block.src, 'https://...') + inputRow('Alt-text', 'alt', block.alt) + inputRow('Bredd (px)', 'width', block.width),
    button: () => inputRow('Knapptext', 'text', block.text) + inputRow('Länk-URL', 'url', block.url),
    'article-card': () => inputRow('Rubrik', 'title', block.title) + inputRow('Beskrivning', 'desc', block.desc) + inputRow('Etikett', 'label', block.label) + inputRow('Knapptext', 'cta', block.cta) + inputRow('Länk-URL', 'url', block.url),
    cta: () => inputRow('Text', 'text', block.text) + inputRow('Länk-URL', 'url', block.url),
    dynamic: () => segmentSelect(block) + inputRow('Fallback-innehåll', 'fallback', block.fallback),
    footer: () => inputRow('Footer-text', 'text', block.text),
    divider: () => `<div class="text-xs text-slate-400">Avdelaren har inga egenskaper.</div>`,
  };
  const body = fields[block.type] ? fields[block.type]() : '<div class="text-xs text-slate-400">Inga egenskaper.</div>';
  return `<div class="bg-white rounded-xl border border-slate-200 p-4">
    <div class="text-xs text-slate-400 mb-3 font-semibold uppercase">Egenskaper · ${block.type}</div>
    ${body}
  </div>`;
}

function segmentSelect(block) {
  const segs = (DATA.app.segments || []).map(s => s.name);
  const opts = ['Icke-betalande', 'Betalande', ...segs]
    .map(s => `<option ${s === block.segment ? 'selected' : ''}>${s}</option>`).join('');
  return `<label class="block mb-3"><span class="text-xs text-slate-400">Visa för segment</span>
    <select data-prop="segment" class="w-full mt-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm">${opts}</select></label>`;
}

function wireInspector() {
  document.querySelectorAll('[data-prop]').forEach(node => {
    const ev = node.tagName === 'SELECT' ? 'change' : 'input';
    node.addEventListener(ev, () => {
      const found = findBlock(selectedBlockId);
      if (!found) return;
      found.block[node.getAttribute('data-prop')] = node.value;
      renderCanvas(); // uppdatera canvasen live (utan att rendera om inspektorn = behåll fokus)
    });
  });
}

// ============================================================
// SIMULERAD AI
// Returnerar förskrivna förslag beroende på blocktyp.
// Byts senare mot riktigt API-anrop bakom en backend.
// ============================================================
const AI_SUGGESTIONS = {
  heading: ['Det här får du inte missa den här veckan', 'Veckans viktigaste – samlat på ett ställe', 'Fem nyheter som påverkar din vardag', 'Lokalt, snabbt och relevant – din vecka i korthet'],
  text: ['Vi har samlat veckans mest lästa artiklar så att du snabbt hänger med i vad som händer där du bor.', 'Här är ett urval av det som engagerat våra läsare mest den senaste veckan.', 'Missa inget viktigt – det här är de nyheter som format veckan i din kommun.'],
  'article-card': ['Allt du behöver veta inför helgen', 'Så påverkas du av det senaste beslutet', 'Vi förklarar: det här betyder förändringen för dig'],
  cta: ['Bli prenumerant – läs allt utan begränsning', 'Stötta lokal journalistik, prova 1 månad gratis', 'Lås upp hela artikeln – starta din prenumeration idag'],
  button: ['Läs hela artikeln', 'Ta del av erbjudandet', 'Fortsätt läsa'],
};
const AI_DESIGNS = [
  { name: 'Nyhetsfokus', desc: 'Hero + två artikelkort + CTA. Bra för redaktionella veckobrev.' },
  { name: 'Kampanj', desc: 'Stor hero, en tydlig CTA, minimal text. Bra för erbjudanden.' },
  { name: 'Digest', desc: 'Lista av artikelkort i en kolumn. Bra för många länkar.' },
];

function aiPanel(block) {
  const canSuggestText = block && AI_SUGGESTIONS[block.type];
  return `<div class="bg-white rounded-xl border border-slate-200 p-4">
    <div class="text-xs text-slate-400 mb-3 font-semibold uppercase flex items-center gap-2">
      <span class="badge bg-violet-100 text-violet-700">✨ AI</span> Assistent <span class="text-slate-300 normal-case font-normal">(simulerad)</span></div>
    ${canSuggestText
      ? `<button onclick="aiSuggestText()" class="w-full mb-2 bg-violet-600 text-white px-3 py-2 rounded-lg text-sm">Föreslå ${block.type === 'text' ? 'text' : 'rubrik/text'}</button>`
      : `<div class="text-xs text-slate-400 mb-2">Markera ett text-, rubrik-, knapp-, CTA- eller kortblock för textförslag.</div>`}
    <button onclick="aiSuggestDesign()" class="w-full bg-white border border-violet-300 text-violet-700 px-3 py-2 rounded-lg text-sm">Föreslå layout</button>
    <div id="ai-output" class="mt-3 space-y-2"></div>
  </div>`;
}

function aiSuggestText() {
  const found = findBlock(selectedBlockId);
  if (!found) return;
  const pool = AI_SUGGESTIONS[found.block.type] || [];
  const field = found.block.type === 'article-card' ? 'title' : 'text';
  const out = $('#ai-output');
  out.innerHTML = `<div class="text-xs text-slate-400">Klicka för att använda ett förslag:</div>` +
    pool.map(s => `<button class="ai-pick block w-full text-left text-sm border border-slate-200 rounded-lg p-2 hover:border-violet-400 hover:bg-violet-50"
      data-field="${field}" data-text="${s.replace(/"/g, '&quot;')}">${s}</button>`).join('');
  out.querySelectorAll('.ai-pick').forEach(btn => {
    btn.onclick = () => {
      const f = findBlock(selectedBlockId);
      if (!f) return;
      f.block[btn.getAttribute('data-field')] = btn.getAttribute('data-text');
      renderCanvas(); renderInspector();
    };
  });
}

function aiSuggestDesign() {
  const out = $('#ai-output');
  out.innerHTML = `<div class="text-xs text-slate-400">Föreslagna layouter (simulerade):</div>` +
    AI_DESIGNS.map(d => `<div class="text-sm border border-slate-200 rounded-lg p-2">
      <div class="font-medium">${d.name}</div>
      <div class="text-xs text-slate-500">${d.desc}</div></div>`).join('') +
    `<div class="text-xs text-slate-400 mt-1">I riktig app genererar AI:n en faktisk blockstruktur du kan applicera.</div>`;
}

function helpPanel() {
  return `<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
    <b>E-postsäker design:</b> block snappar till sektioner/rader/kolumner. HTML genereras som tabeller för Outlook-stöd. Fri placering tillåts inom säkra containrar.</div>`;
}

// ============================================================
// PREVIEW (HTML-generering)
// ============================================================
function togglePreview() {
  const panel = $('#preview-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    panel.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="flex justify-between mb-3"><h2 class="font-semibold">Genererad e-post-HTML (tabellbaserad)</h2>
          <div class="text-xs text-emerald-600">✓ Validering: inga blockerande fel</div></div>
        <pre class="bg-slate-900 text-green-300 text-xs p-4 rounded-lg overflow-x-auto max-h-80">${escapeHtml(generateEmailHtml())}</pre>
        <p class="text-xs text-slate-400 mt-2">HTML genereras från blockträdet först vid preview/test/utskick – aldrig lagrad som rå HTML.</p>
      </div>`;
  }
}
function toggleJson() {
  const panel = $('#json-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    panel.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="font-semibold mb-3">Blockträd (JSON) – det här lagras i databasen</h2>
        <pre class="bg-slate-900 text-blue-300 text-xs p-4 rounded-lg overflow-x-auto max-h-80">${escapeHtml(JSON.stringify(editorTree, null, 2))}</pre>
      </div>`;
  }
}

function generateEmailHtml() {
  let rows = '';
  editorTree.sections.forEach(s => {
    let cols = '';
    s.rows.forEach(row => {
      row.columns.forEach(col => {
        let blocks = col.blocks.map(b => blockToHtml(b)).join('\n');
        cols += `        <td width="${Math.round(col.width / 12 * 100)}%" valign="top">\n${blocks}\n        </td>\n`;
      });
    });
    rows += `  <tr><td bgcolor="${s.background}">\n    <table width="100%" cellpadding="0" cellspacing="0"><tr>\n${cols}    </tr></table>\n  </td></tr>\n`;
  });
  return `<table width="600" cellpadding="0" cellspacing="0" align="center" style="font-family:${editorTree.settings.fontFamily}">\n${rows}</table>`;
}

function blockToHtml(b) {
  switch (b.type) {
    case 'heading': return `          <h1 style="margin:16px">${b.text}</h1>`;
    case 'text': return `          <p style="margin:16px;font-size:14px">${b.text}</p>`;
    case 'image': return `          <img src="${b.src || '#'}" alt="${b.alt}" width="${b.width || 600}" style="display:block">`;
    case 'button': return `          <a href="${b.url}" style="background:#1d4ed8;color:#fff;padding:12px 20px;display:inline-block;margin:16px">${b.text}</a>`;
    case 'article-card': return `          <!-- artikelkort -->\n          <h3 style="margin:8px 16px">${b.title}</h3><p style="margin:0 16px;font-size:13px">${b.desc}</p><a href="${b.url}" style="margin:8px 16px;color:#1d4ed8">${b.cta}</a>`;
    case 'cta': return `          <div style="padding:24px;text-align:center"><strong>${b.text}</strong></div>`;
    case 'dynamic': return `          {{#if segment "${b.segment}"}} ... {{else}} ${b.fallback} {{/if}}`;
    case 'divider': return `          <hr style="border:none;border-top:1px solid #e2e8f0">`;
    case 'footer': return `          <p style="text-align:center;font-size:11px;color:#94a3b8;padding:16px">${b.text}<br><a href="{{unsubscribe_url}}">Avregistrera</a></p>`;
    default: return '';
  }
}
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ============================================================
// CONFIRM – bekräftelsevy före skarpt utskick
// ============================================================
function openConfirm(campId) {
  const x = DATA.campaigns.find(k => k.id === campId) || DATA.campaigns[3];
  const modal = el(`
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onclick="if(event.target===this)this.remove()">
      <div class="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-1">Bekräfta utskick</h2>
        <p class="text-slate-500 text-sm mb-4">Kontrollera allt innan kampanjen skickas skarpt.</p>
        <div class="grid grid-cols-2 gap-3 text-sm mb-4">
          ${field('Kampanj', x.name)}${field('Ämnesrad', x.subject)}
          ${field('Preheader', x.preheader)}${field('Avsändare', x.from)}
          ${field('Reply-to', x.replyTo)}${field('Segment', x.segment)}
          ${field('Exkludering', x.exclude || '–')}${field('Skicktid', x.sentAt || 'Direkt')}
        </div>
        <div class="bg-slate-50 rounded-xl p-4 mb-4">
          <div class="grid grid-cols-3 gap-3 text-center">
            ${stat('Mottagare', fmt(x.recipients || 2210))}
            ${stat('Bortfiltrerade', fmt(x.filtered || 47))}
            ${stat('Skickas till', fmt((x.recipients || 2210) - (x.filtered || 47)))}
          </div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm">
          <div class="font-semibold text-amber-700 mb-2">Bortfiltrering – orsaker</div>
          <div class="space-y-1 text-amber-700 text-xs">
            <div class="flex justify-between"><span>Avregistrerade</span><span>28</span></div>
            <div class="flex justify-between"><span>Spärrade (suppression list)</span><span>12</span></div>
            <div class="flex justify-between"><span>Saknar giltigt samtycke</span><span>5</span></div>
            <div class="flex justify-between"><span>Ogiltig e-postadress</span><span>2</span></div>
          </div>
        </div>
        <div class="space-y-2 text-sm mb-5">
          ${checkRow('Testutskick genomfört', true)}
          ${checkRow('Godkänd av granskare', x.status === 'approved')}
          ${checkRow('Suppression list respekterad', true)}
          ${checkRow('Samtyckeskontroll genomförd', true)}
          ${checkRow('Segment-snapshot skapad', true)}
        </div>
        <div class="flex gap-3 justify-end">
          <button onclick="this.closest('.fixed').remove()" class="border border-slate-300 px-4 py-2 rounded-lg text-sm">Avbryt</button>
          <button onclick="confirmSend(this)" class="bg-brand text-white px-5 py-2 rounded-lg text-sm font-medium">Bekräfta & skicka skarpt</button>
        </div>
      </div>
    </div>`);
  document.body.appendChild(modal);
}
function checkRow(label, ok) {
  return `<div class="flex items-center gap-2">
    <span class="${ok ? 'text-emerald-500' : 'text-amber-500'}">${ok ? '✓' : '⚠'}</span>
    <span class="${ok ? '' : 'text-amber-600'}">${label}${ok ? '' : ' (saknas)'}</span></div>`;
}
function confirmSend(btn) {
  const modal = btn.closest('.fixed');
  modal.querySelector('.bg-white').innerHTML = `
    <div class="text-center py-10">
      <div class="text-5xl mb-4">✅</div>
      <h2 class="text-xl font-bold mb-2">Utskick simulerat</h2>
      <p class="text-slate-500 text-sm mb-6">I prototypen skickas inga riktiga mejl.<br>I riktig app skulle mottagarsnapshot skapas, kön fyllas och provider-adaptern börja skicka.</p>
      <button onclick="this.closest('.fixed').remove()" class="bg-brand text-white px-5 py-2 rounded-lg text-sm">Stäng</button>
    </div>`;
}
