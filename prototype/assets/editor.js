// ============================================================
// Editor – simulerad canvas-liknande drag-and-drop
// Bygger ett blockträd i minnet och renderar HTML-preview.
// Visar kärnprincipen: design = JSON-blockträd, HTML genereras vid preview.
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

// Editor-tillstånd: blockträdet
let editorTree = null;

function defaultBlock(type) {
  const id = 'b_' + Math.random().toString(36).slice(2, 7);
  const defs = {
    heading: { id, type, text: 'Ny rubrik' },
    text: { id, type, text: 'Skriv din text här. Klicka för att redigera.' },
    image: { id, type, alt: 'Bild', placeholder: true },
    button: { id, type, text: 'Klicka här', url: 'https://example.se' },
    'article-card': { id, type, title: 'Artikelrubrik', desc: 'Kort beskrivning av artikeln.', cta: 'Läs mer', label: 'Lokalt', url: 'https://example.se' },
    cta: { id, type, text: 'Bli prenumerant idag', url: 'https://example.se' },
    dynamic: { id, type, segment: 'Icke-betalande', fallback: 'Standardinnehåll' },
    divider: { id, type },
    footer: { id, type, text: 'Du får detta mejl för att du prenumererar.', unsubscribe: true },
  };
  return defs[type] || { id, type };
}

function editorView(c) {
  // Initiera trädet från sampleLayout första gången
  if (!editorTree) {
    editorTree = JSON.parse(JSON.stringify(DATA.app.sampleLayout));
  }

  c.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <button onclick="navigate('campaigns')" class="text-brand text-sm">← Tillbaka</button>
        <h1 class="text-2xl font-bold">Kreativ editor</h1>
        <p class="text-slate-500 text-sm">Dra block från vänster till canvasen. Designen lagras som JSON, inte som HTML.</p>
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
          <div class="text-xs text-slate-400 mb-2 font-semibold uppercase">Block</div>
          <div class="space-y-1">
            ${BLOCK_PALETTE.map(b => `
              <div draggable="true" ondragstart="dragStart(event,'${b.type}')"
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

      <!-- Inspektor / hjälp -->
      <div class="col-span-3">
        <div class="bg-white rounded-xl border border-slate-200 p-4 sticky top-4">
          <div class="text-xs text-slate-400 mb-2 font-semibold uppercase">E-postsäker design</div>
          <ul class="text-xs text-slate-500 space-y-2 list-disc list-inside">
            <li>Block placeras i sektioner → rader → kolumner</li>
            <li>Fri placering tillåts <b>inom</b> säkra containrar</li>
            <li>Element snappar till kolumngrid</li>
            <li>HTML genereras som tabeller för Outlook-stöd</li>
            <li>Systemet varnar för design som inte fungerar i e-postklienter</li>
          </ul>
          <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <b>Hybridmodell:</b> Fri canvas-känsla + strukturerade sektioner = robust e-post.
          </div>
        </div>
      </div>
    </div>

    <!-- Preview/JSON-paneler -->
    <div id="preview-panel" class="hidden mt-4"></div>
    <div id="json-panel" class="hidden mt-4"></div>
  `;

  renderCanvas();
}

// ---------- Drag & drop ----------
let draggedType = null;
function dragStart(e, type) { draggedType = type; }

function renderCanvas() {
  const canvas = $('#email-canvas');
  canvas.innerHTML = '';
  editorTree.sections.forEach(section => {
    const sec = el(`<div style="background:${section.background}"></div>`);
    section.rows.forEach(row => {
      const r = el(`<div class="flex" style="gap:0"></div>`);
      row.columns.forEach(col => {
        const colDiv = el(`<div style="flex:${col.width}" class="drop-zone p-1" data-col="${col.id}"></div>`);
        colDiv.addEventListener('dragover', (e) => { e.preventDefault(); colDiv.classList.add('drag-over'); });
        colDiv.addEventListener('dragleave', () => colDiv.classList.remove('drag-over'));
        colDiv.addEventListener('drop', (e) => {
          e.preventDefault(); colDiv.classList.remove('drag-over');
          if (draggedType) { col.blocks.push(defaultBlock(draggedType)); draggedType = null; renderCanvas(); }
        });
        col.blocks.forEach(block => colDiv.appendChild(renderBlock(block, col)));
        if (col.blocks.length === 0) colDiv.appendChild(el(`<div class="text-center text-xs text-slate-300 py-6 border border-dashed border-slate-200 rounded">Släpp block här</div>`));
        r.appendChild(colDiv);
      });
      sec.appendChild(r);
    });
    canvas.appendChild(sec);
  });
}

function renderBlock(block, col) {
  let inner = '';
  switch (block.type) {
    case 'heading': inner = `<h2 contenteditable="true" class="text-xl font-bold p-2 outline-none">${block.text}</h2>`; break;
    case 'text': inner = `<p contenteditable="true" class="p-2 text-slate-700 outline-none text-sm">${block.text}</p>`; break;
    case 'image': inner = `<div class="bg-slate-100 text-slate-400 text-center py-10 text-sm m-2 rounded">${block.placeholder ? '▣ Bildplatshållare' : block.src}</div>`; break;
    case 'button': inner = `<div class="p-2"><span class="inline-block bg-brand text-white px-4 py-2 rounded text-sm">${block.text}</span></div>`; break;
    case 'article-card': inner = `<div class="m-2 border border-slate-200 rounded-lg overflow-hidden">
      <div class="bg-slate-100 text-slate-400 text-center py-6 text-xs">▣ bild</div>
      <div class="p-3">${block.label ? `<span class="badge bg-brand-light text-brand">${block.label}</span>` : ''}
      <div class="font-semibold mt-1" contenteditable="true">${block.title}</div>
      <div class="text-xs text-slate-500" contenteditable="true">${block.desc}</div>
      <span class="text-brand text-xs font-medium">${block.cta} →</span></div></div>`; break;
    case 'cta': inner = `<div class="p-4 text-center text-white"><div class="font-bold mb-2" contenteditable="true">${block.text}</div>
      <span class="inline-block bg-white text-brand px-4 py-2 rounded text-sm font-medium">Klicka här</span></div>`; break;
    case 'dynamic': inner = `<div class="m-2 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg p-3 text-xs">
      <span class="badge bg-amber-100 text-amber-700">⚡ Dynamiskt block</span>
      <div class="mt-1 text-amber-700">Visas för: <b>${block.segment}</b></div>
      <div class="text-amber-600">Fallback: ${block.fallback}</div></div>`; break;
    case 'divider': inner = `<hr class="my-2 border-slate-200">`; break;
    case 'footer': inner = `<div class="p-3 text-center text-xs text-slate-400">${block.text}<br>
      <a class="underline">Avregistrera</a></div>`; break;
    default: inner = `<div class="p-2 text-xs text-slate-400">${block.type}</div>`;
  }
  const wrap = el(`<div class="canvas-block relative group" data-block="${block.id}">${inner}</div>`);
  const del = el(`<button class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs hidden group-hover:block">×</button>`);
  del.onclick = () => { col.blocks = col.blocks.filter(b => b.id !== block.id); renderCanvas(); };
  wrap.appendChild(del);
  return wrap;
}

// ---------- Preview (HTML-generering) ----------
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
  // Förenklad tabellbaserad render – demonstrerar principen
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
