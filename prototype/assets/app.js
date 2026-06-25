// ============================================================
// Media Mailer – Prototyp
// Ren JS, ingen byggprocess. All data är mockdata.
// ============================================================

let DATA = { contacts: [], campaigns: [], app: {} };

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◫' },
  { id: 'campaigns', label: 'Kampanjer', icon: '✉' },
  { id: 'editor', label: 'Editor', icon: '✎' },
  { id: 'templates', label: 'Mallar', icon: '▤' },
  { id: 'blocks', label: 'Block', icon: '▦' },
  { id: 'contacts', label: 'Kontakter', icon: '◉' },
  { id: 'segments', label: 'Segment', icon: '⛃' },
  { id: 'automations', label: 'Automationer', icon: '⟳' },
  { id: 'analytics', label: 'Analys', icon: '◔' },
  { id: 'imports', label: 'Import', icon: '↧' },
  { id: 'integrations', label: 'Integrationer', icon: '⇄' },
  { id: 'settings', label: 'Inställningar', icon: '⚙' },
];

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const fmt = (n) => n.toLocaleString('sv-SE');
const pct = (n) => (n * 100).toFixed(1) + '%';

const statusColors = {
  draft: 'bg-slate-100 text-slate-600', in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700', scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-indigo-100 text-indigo-700', sent: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700', failed: 'bg-red-100 text-red-700',
  archived: 'bg-slate-100 text-slate-400'
};
const statusLabel = {
  draft: 'Utkast', in_review: 'Granskas', approved: 'Godkänd', scheduled: 'Schemalagd',
  sending: 'Skickar', sent: 'Skickad', paused: 'Pausad', failed: 'Misslyckad', archived: 'Arkiverad'
};

function card(content, cls = '') {
  return `<div class="bg-white rounded-xl border border-slate-200 p-5 ${cls}">${content}</div>`;
}
function pageHeader(title, subtitle, action = '') {
  return `<div class="flex items-start justify-between mb-6">
    <div><h1 class="text-2xl font-bold">${title}</h1>
    ${subtitle ? `<p class="text-slate-500 mt-1">${subtitle}</p>` : ''}</div>
    <div>${action}</div></div>`;
}

// ---------- Router ----------
function navigate(id) {
  location.hash = id;
}
window.addEventListener('hashchange', render);

function render() {
  const route = (location.hash.replace('#', '') || 'dashboard').split('/');
  const view = route[0];
  const param = route[1];
  document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.id === view));
  const container = $('#view');
  const fn = VIEWS[view] || VIEWS.dashboard;
  container.innerHTML = '';
  fn(container, param);
}

// ============================================================
// VIEWS
// ============================================================
const VIEWS = {};

// ---------- Dashboard ----------
VIEWS.dashboard = (c) => {
  const a = DATA.app.analytics;
  const o = DATA.app.overview;
  const t = o.trends;
  const recent = DATA.campaigns.filter(x => x.status === 'sent');

  // Trendgraf: öppningsgrad senaste utskicken
  const openSeries = DATA.app.trendSeries.map(s => ({ label: s.label, value: s.openRate }));

  c.innerHTML = pageHeader('Dashboard', 'Överblick över verksamheten och pågående utskick') + `
    <!-- Räknare: vad har vi / vad är på gång -->
    <div class="grid grid-cols-6 gap-3 mb-6">
      ${counter('Nyhetsbrev', o.newsletters, 'newsletters', 'brand')}
      ${counter('Automationer', o.activeAutomations, 'automations', 'violet')}
      ${counter('Schemalagda', o.scheduledCampaigns, 'campaigns', 'blue')}
      ${counter('I granskning', o.inReview, 'campaigns', 'amber')}
      ${counter('Utkast', o.drafts, 'campaigns', 'slate')}
      ${counter('Kontakter', fmt(o.totalContacts), 'contacts', 'emerald')}
    </div>

    <!-- Prestanda-KPI med trendpil -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${kpi('Skickade mejl (totalt)', fmt(a.totalSent), 'brand')}
      ${kpi('Genomsnittlig öppning', pct(a.avgOpenRate), 'emerald', trendPill(t.openRate))}
      ${kpi('Genomsnittlig CTR', pct(a.avgCtr), 'blue', trendPill(t.ctr))}
      ${kpi('Avregistreringar', pct(a.unsubRate), 'orange', trendPill(t.unsubRate, { goodWhenUp: false }))}
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <!-- Trendgraf -->
      <div class="col-span-2">${card(`
        <div class="flex justify-between items-center mb-3">
          <h2 class="font-semibold">Öppningsgrad – senaste 8 utskicken</h2>
          <span class="text-xs text-slate-400">trend</span></div>
        ${lineChart(openSeries, { color: '#10b981', fmt: pct })}
      `)}</div>
      <!-- Kräver uppmärksamhet -->
      <div>${card(`
        <h2 class="font-semibold mb-3">Kräver din uppmärksamhet</h2>
        <div class="space-y-2">
          ${DATA.app.attention.map(item => `
            <a href="#campaigns/${item.campaign}" class="block p-2 rounded-lg border ${item.level === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'} text-xs hover:opacity-80">
              <span class="${item.level === 'warn' ? 'text-amber-700' : 'text-blue-700'}">${item.level === 'warn' ? '⚠' : 'ℹ'} ${item.text}</span>
            </a>`).join('')}
        </div>`)}</div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">${card(`
        <h2 class="font-semibold mb-4">Senaste kampanjer</h2>
        <div class="space-y-3">
          ${recent.map(x => `
            <a href="#analytics/${x.id}" class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded px-1">
              <div><div class="font-medium">${x.name}</div>
                <div class="text-xs text-slate-400">${x.newsletter} · ${x.sentAt}</div></div>
              <div class="text-right text-sm">
                <span class="text-emerald-600 font-semibold">${pct(x.opened / x.recipients)}</span>
                <span class="text-slate-400"> öppning</span></div>
            </a>`).join('')}
        </div>`)}</div>
      <div>${card(`
        <h2 class="font-semibold mb-4">Mest klickade länkar</h2>
        ${a.topLinks.map(l => `
          <div class="flex justify-between text-sm py-2 border-b border-slate-100 last:border-0">
            <span class="text-slate-600 truncate">${l.url}</span>
            <span class="font-semibold">${fmt(l.clicks)}</span></div>`).join('')}
      `)}</div>
    </div>`;
};

function counter(label, value, route, color) {
  return `<a href="#${route}" class="bg-white rounded-xl border border-slate-200 p-3 block hover:border-${color === 'brand' ? 'brand' : color + '-400'} transition-colors">
    <div class="text-2xl font-bold text-${color === 'brand' ? 'brand' : color + '-600'}">${value}</div>
    <div class="text-xs text-slate-400 mt-0.5">${label}</div></a>`;
}

function kpi(label, value, color, extra = '') {
  return card(`<div class="text-xs text-slate-400 mb-1 flex justify-between">${label} ${extra}</div>
    <div class="text-2xl font-bold text-${color === 'brand' ? 'brand' : color + '-600'}">${value}</div>`);
}

// ---------- Campaigns ----------
VIEWS.campaigns = (c, id) => {
  if (id) return campaignDetail(c, id);
  const action = `<button onclick="navigate('editor')" class="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium">+ Ny kampanj</button>`;
  c.innerHTML = pageHeader('Kampanjer', 'Skapa, granska, schemalägg och skicka utskick', action) + `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-5 py-3 font-medium">Namn</th><th class="px-5 py-3 font-medium">Nyhetsbrev</th>
          <th class="px-5 py-3 font-medium">Status</th><th class="px-5 py-3 font-medium">Mottagare</th>
          <th class="px-5 py-3 font-medium">Öppning</th></tr></thead>
        <tbody>
          ${DATA.campaigns.map(x => `
            <tr onclick="navigate('campaigns/${x.id}')" class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
              <td class="px-5 py-3 font-medium">${x.name}</td>
              <td class="px-5 py-3 text-slate-500">${x.newsletter}</td>
              <td class="px-5 py-3"><span class="badge ${statusColors[x.status]}">${statusLabel[x.status]}</span></td>
              <td class="px-5 py-3">${x.recipients ? fmt(x.recipients) : '–'}</td>
              <td class="px-5 py-3">${x.recipients ? pct(x.opened / x.recipients) : '–'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};

function campaignDetail(c, id) {
  const x = DATA.campaigns.find(k => k.id === id);
  if (!x) { c.innerHTML = '<p>Kampanj saknas.</p>'; return; }
  const back = `<button onclick="navigate('campaigns')" class="text-brand text-sm mb-4">← Tillbaka</button>`;
  const canSend = ['approved', 'scheduled', 'in_review'].includes(x.status);
  c.innerHTML = back + pageHeader(x.name, `${x.newsletter} · ${x.type}`,
    canSend ? `<button onclick="openConfirm('${x.id}')" class="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium">Förhandsgranska & skicka</button>` : '') + `
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 space-y-4">
        ${card(`<h2 class="font-semibold mb-3">Utskicksinformation</h2>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            ${field('Ämnesrad', x.subject)}${field('Preheader', x.preheader)}
            ${field('Avsändare', x.from)}${field('Reply-to', x.replyTo)}
            ${field('Segment', x.segment)}${field('Exkludering', x.exclude || '–')}
          </dl>`)}
        ${x.status === 'sent' ? card(`<h2 class="font-semibold mb-3">Resultat</h2>
          <div class="grid grid-cols-4 gap-3 text-center">
            ${stat('Öppnat', pct(x.opened / x.recipients))}
            ${stat('Klick', pct(x.clicked / x.recipients))}
            ${stat('Avreg.', x.unsubscribed)}
            ${stat('Bounce', x.bounced)}
          </div>`) : ''}
      </div>
      <div>${card(`<h2 class="font-semibold mb-3">Status</h2>
        <span class="badge ${statusColors[x.status]}">${statusLabel[x.status]}</span>
        <div class="mt-4 text-sm text-slate-500 space-y-2">
          <div>Mottagare: <b>${fmt(x.recipients)}</b></div>
          ${x.filtered ? `<div>Bortfiltrerade: <b>${fmt(x.filtered)}</b></div>` : ''}
          ${x.sentAt ? `<div>Tid: <b>${x.sentAt}</b></div>` : ''}
        </div>`)}</div>
    </div>`;
}
const field = (k, v) => `<div><dt class="text-slate-400">${k}</dt><dd class="font-medium">${v}</dd></div>`;
const stat = (k, v) => `<div><div class="text-xl font-bold">${v}</div><div class="text-xs text-slate-400">${k}</div></div>`;

// ---------- Contacts ----------
VIEWS.contacts = (c) => {
  c.innerHTML = pageHeader('Kontakter', `${fmt(DATA.contacts.length)} kontakter (urval i prototyp)`,
    `<button onclick="navigate('imports')" class="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium">Importera</button>`) + `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-5 py-3 font-medium">Namn</th><th class="px-5 py-3 font-medium">E-post</th>
          <th class="px-5 py-3 font-medium">Status</th><th class="px-5 py-3 font-medium">Samtycke</th>
          <th class="px-5 py-3 font-medium">Kommun</th><th class="px-5 py-3 font-medium">Spärr</th></tr></thead>
        <tbody>
          ${DATA.contacts.map(x => `
            <tr class="border-t border-slate-100 hover:bg-slate-50">
              <td class="px-5 py-3 font-medium">${x.name}</td>
              <td class="px-5 py-3 text-slate-500">${x.email}</td>
              <td class="px-5 py-3">${x.status}</td>
              <td class="px-5 py-3 text-xs">${x.consent}</td>
              <td class="px-5 py-3">${x.municipality}</td>
              <td class="px-5 py-3">${x.suppressed ? '<span class="badge bg-red-100 text-red-700">Spärrad</span>' : '–'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};

// ---------- Segments ----------
VIEWS.segments = (c) => {
  const segs = DATA.app.segments;
  c.innerHTML = pageHeader('Segment', 'Dynamiska målgrupper med AND/OR/NOT-regler',
    `<button class="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nytt segment</button>`) + `
    <div class="grid grid-cols-2 gap-4">
      ${segs.map(s => card(`
        <div class="flex justify-between items-start mb-3">
          <div><div class="font-semibold">${s.name}</div>
            <div class="text-xs text-slate-400 mt-1">${s.live ? 'Live-segment' : 'Snapshot'}</div></div>
          <div class="text-right"><div class="text-xl font-bold text-brand">${fmt(s.count)}</div>
            <div class="text-xs text-slate-400">mottagare</div></div>
        </div>
        <div class="text-xs bg-slate-50 rounded-lg p-3 font-mono">
          <span class="text-brand font-semibold">${s.logic}</span><br>
          ${s.rules.map(r => `${r.field} <span class="text-amber-600">${r.op}</span> ${JSON.stringify(r.value)}`).join('<br>')}
        </div>`)).join('')}
    </div>`;
};

// ---------- Templates ----------
VIEWS.templates = (c) => {
  const lockBadge = { locked: 'bg-red-100 text-red-700', partial: 'bg-amber-100 text-amber-700', free: 'bg-emerald-100 text-emerald-700' };
  const lockLabel = { locked: 'Låst', partial: 'Delvis låst', free: 'Fri' };
  c.innerHTML = pageHeader('Mallar', 'Återanvändbara utskicksmallar') + `
    <div class="grid grid-cols-3 gap-4">
      ${DATA.app.templates.map(t => card(`
        <div class="flex justify-between items-start mb-2">
          <div class="font-semibold">${t.name}</div>
          <span class="badge ${lockBadge[t.locked]}">${lockLabel[t.locked]}</span></div>
        <div class="text-sm text-slate-500 mb-4">${t.description}</div>
        <button onclick="navigate('editor')" class="text-brand text-sm font-medium">Använd mall →</button>`)).join('')}
    </div>`;
};

// ---------- Blocks ----------
VIEWS.blocks = (c) => {
  c.innerHTML = pageHeader('Block', 'Återanvändbara innehållsblock') + `
    <div class="grid grid-cols-3 gap-4">
      ${DATA.app.blocks.map(b => card(`
        <div class="flex justify-between items-start mb-2">
          <div><div class="font-semibold">${b.name}</div>
            <div class="text-xs text-slate-400">${b.type}</div></div>
          ${b.approved ? '<span class="badge bg-emerald-100 text-emerald-700">Godkänd</span>' : '<span class="badge bg-slate-100 text-slate-500">Utkast</span>'}</div>
        <div class="text-xs text-slate-400">${b.shared ? 'Delas i teamet' : 'Privat'}</div>`)).join('')}
    </div>`;
};

// ---------- Analytics ----------
VIEWS.analytics = (c, id) => {
  if (id) return campaignReport(c, id);

  const sent = DATA.campaigns.filter(x => x.status === 'sent');
  const b = DATA.app.benchmarks;
  // Aggregerad tratt över alla skickade kampanjer
  const agg = sent.reduce((acc, x) => {
    acc.sent += x.recipients; acc.delivered += x.recipients - x.bounced;
    acc.opened += x.opened; acc.clicked += x.clicked; return acc;
  }, { sent: 0, delivered: 0, opened: 0, clicked: 0 });

  const ctrSeries = DATA.app.trendSeries.map(s => ({ label: s.label, value: s.ctr }));

  c.innerHTML = pageHeader('Analys', 'Hur utskicken levererar och presterar') + `
    <!-- Tratt + trend sida vid sida -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      ${card(`<h2 class="font-semibold mb-4">Leveranstratt – alla utskick</h2>
        ${funnelChart([
          { label: 'Skickat', value: agg.sent, color: '#1d4ed8' },
          { label: 'Levererat', value: agg.delivered, color: '#0ea5e9' },
          { label: 'Öppnat', value: agg.opened, color: '#10b981' },
          { label: 'Klickat', value: agg.clicked, color: '#8b5cf6' },
        ])}`)}
      ${card(`<h2 class="font-semibold mb-4">Klickfrekvens (CTR) över tid</h2>
        ${lineChart(ctrSeries, { color: '#8b5cf6', fmt: pct })}
        <div class="grid grid-cols-3 gap-2 mt-4 text-center">
          ${benchStat('Öppning', agg.opened / agg.sent, b.openRate)}
          ${benchStat('CTR', agg.clicked / agg.sent, b.ctr)}
          ${benchStat('Leverans', agg.delivered / agg.sent, 1 - b.bounceRate)}
        </div>`)}
    </div>

    <!-- Tabell per kampanj, klickbar för djuprapport -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-3">
      <div class="px-5 py-3 border-b border-slate-100 font-semibold">Resultat per kampanj</div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-5 py-3 font-medium">Kampanj</th><th class="px-5 py-3 font-medium">Skickat</th>
          <th class="px-5 py-3 font-medium">Öppnat</th><th class="px-5 py-3 font-medium">CTR</th>
          <th class="px-5 py-3 font-medium">Avreg.</th><th class="px-5 py-3 font-medium">Bounce</th><th></th></tr></thead>
        <tbody>${sent.map(x => `
          <tr onclick="navigate('analytics/${x.id}')" class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
            <td class="px-5 py-3 font-medium">${x.name}</td>
            <td class="px-5 py-3">${fmt(x.recipients)}</td>
            <td class="px-5 py-3">${pct(x.opened / x.recipients)}</td>
            <td class="px-5 py-3">${pct(x.clicked / x.recipients)}</td>
            <td class="px-5 py-3">${x.unsubscribed}</td>
            <td class="px-5 py-3">${x.bounced}</td>
            <td class="px-5 py-3 text-brand text-xs">Rapport →</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="text-xs text-slate-400">Siffror är mockdata. I riktig app kommer dessa från provider-webhooks och tracking-events.</p>`;
};

function benchStat(label, value, bench) {
  const good = value >= bench;
  return `<div>
    <div class="text-lg font-bold ${good ? 'text-emerald-600' : 'text-amber-600'}">${pct(value)}</div>
    <div class="text-[10px] text-slate-400">${label}</div>
    <div class="text-[10px] ${good ? 'text-emerald-500' : 'text-amber-500'}">${good ? '↑' : '↓'} bransch ${pct(bench)}</div>
  </div>`;
}

// ---------- Djup kampanjrapport ----------
function campaignReport(c, id) {
  const x = DATA.campaigns.find(k => k.id === id);
  const data = DATA.app.campaignAnalytics[id];
  if (!x) { c.innerHTML = '<p>Kampanj saknas.</p>'; return; }

  const back = `<button onclick="navigate('analytics')" class="text-brand text-sm mb-4">← Tillbaka till analys</button>`;

  if (!data) {
    c.innerHTML = back + pageHeader(x.name, 'Detaljrapport') +
      card(`<p class="text-sm text-slate-500">Ingen detaljerad analysdata för denna kampanj i prototypen.</p>`);
    return;
  }

  const f = data.funnel;
  c.innerHTML = back + pageHeader(x.name, `${x.newsletter} · skickad ${x.sentAt}`) + `
    <!-- Nyckeltal -->
    <div class="grid grid-cols-4 gap-4 mb-4">
      ${kpi('Levererat', pct(f.delivered / f.sent), 'blue')}
      ${kpi('Öppnat', pct(f.opened / f.delivered), 'emerald')}
      ${kpi('Klickat (CTR)', pct(f.clicked / f.delivered), 'violet')}
      ${kpi('CTOR (klick/öppning)', pct(f.clicked / f.opened), 'brand')}
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      ${card(`<h2 class="font-semibold mb-4">Leveranstratt</h2>
        ${funnelChart([
          { label: 'Skickat', value: f.sent, color: '#1d4ed8' },
          { label: 'Levererat', value: f.delivered, color: '#0ea5e9' },
          { label: 'Öppnat', value: f.opened, color: '#10b981' },
          { label: 'Klickat', value: f.clicked, color: '#8b5cf6' },
        ])}`)}
      ${card(`<h2 class="font-semibold mb-4">När mejlet öppnades</h2>
        ${barChart(data.openTimeline, { color: '#10b981' })}
        <p class="text-xs text-slate-400 mt-3">De flesta öppningar sker första timmarna – relevant för bästa skicktid.</p>`)}
    </div>

    <div class="grid grid-cols-2 gap-4">
      ${card(`<h2 class="font-semibold mb-4">Vilket innehåll fungerade bäst</h2>
        ${hBars(data.blocks.map(bl => ({ label: bl.name, value: bl.clicks, sub: pct(bl.ctr) + ' CTR' })), { color: '#1d4ed8' })}
        <p class="text-xs text-slate-400 mt-3">Klick per block visar vilket innehåll som engagerar – styr framtida design.</p>`)}
      ${card(`<h2 class="font-semibold mb-4">Mest klickade länkar</h2>
        ${hBars(data.links.map(l => ({ label: l.url, value: l.clicks })), { color: '#8b5cf6' })}`)}
    </div>`;
}

// ---------- Imports ----------
VIEWS.imports = (c) => {
  c.innerHTML = pageHeader('Import', 'CSV/XLSX-import med fältmappning, validering och deduplicering') + `
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">${card(`
        <div class="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400">
          <div class="text-3xl mb-2">↧</div>
          Dra en CSV/XLSX-fil hit (simulerat)<br>
          <button onclick="simulateImport()" class="mt-3 bg-brand text-white px-4 py-2 rounded-lg text-sm">Simulera import</button>
        </div>
        <div id="import-result" class="mt-4"></div>`)}</div>
      <div>${card(`<h2 class="font-semibold mb-3">Importprinciper</h2>
        <ul class="text-sm text-slate-500 space-y-2 list-disc list-inside">
          <li>Opt-out skrivs aldrig över</li>
          <li>Spärrade mottagare skyddas</li>
          <li>Deduplicering på contact_id + e-post</li>
          <li>Ogiltiga adresser flaggas</li>
          <li>Importlogg sparas</li></ul>`)}</div>
    </div>`;
};
function simulateImport() {
  $('#import-result').innerHTML = `
    <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
      <div class="font-semibold text-emerald-700 mb-2">Import klar (simulerad)</div>
      <div class="grid grid-cols-4 gap-2 text-center">
        ${stat('Rader', '1 240')}${stat('Nya', '910')}${stat('Dubletter', '318')}${stat('Skyddade opt-out', '12')}
      </div></div>`;
}

// ---------- Integrations ----------
VIEWS.integrations = (c) => {
  c.innerHTML = pageHeader('Integrationer', 'Säker koppling mot interna datakällor via integrationslager') + `
    <div class="grid grid-cols-2 gap-4">
      ${card(`<h2 class="font-semibold mb-3">Arkitekturprincip</h2>
        <div class="text-sm text-slate-500 space-y-2">
          <div>Interna system → integrationslager → mejlverktygets egen databas</div>
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-xs mt-2">
            Mejlverktyget läser <b>aldrig</b> direkt mot produktionsdatabaser. All synk går via API/export/event.</div>
        </div>`)}
      ${card(`<h2 class="font-semibold mb-3">Datakällor</h2>
        <div class="space-y-2 text-sm">
          ${['Prenumerationssystem (API)', 'Kunddatabas (schemalagd export)', 'CSV/XLSX (manuell)', 'E-postprovider (webhooks)'].map(s =>
            `<div class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span>${s}</span><span class="badge bg-emerald-100 text-emerald-700">Aktiv</span></div>`).join('')}
        </div>`)}
    </div>`;
};

// ---------- Automations ----------
VIEWS.automations = (c) => {
  const flows = [
    { name: 'Välkomstserie', trigger: 'Ny prenumeration', steps: 4, status: 'active' },
    { name: 'Winback inaktiva', trigger: 'Inte öppnat 90 dagar', steps: 3, status: 'active' },
    { name: 'Onboarding betalande', trigger: 'Ändrad betalstatus', steps: 5, status: 'draft' },
  ];
  c.innerHTML = pageHeader('Automationer', 'Journeys baserade på triggers och villkor') + `
    <div class="space-y-4">
      ${flows.map(f => card(`
        <div class="flex justify-between items-center">
          <div><div class="font-semibold">${f.name}</div>
            <div class="text-xs text-slate-400">Trigger: ${f.trigger} · ${f.steps} steg</div></div>
          <span class="badge ${f.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${f.status === 'active' ? 'Aktiv' : 'Utkast'}</span>
        </div>`)).join('')}
    </div>
    <p class="text-xs text-slate-400 mt-4">I MVP: enkel linjär journey (trigger → wait → send → condition). Avancerade förgreningar kommer senare.</p>`;
};

// ---------- Settings ----------
VIEWS.settings = (c) => {
  c.innerHTML = pageHeader('Inställningar', 'Roller, behörigheter och avsändare') + `
    <div class="grid grid-cols-2 gap-4">
      ${card(`<h2 class="font-semibold mb-3">Roller</h2>
        ${['Admin', 'Marknadsförare', 'Redaktör', 'Designer', 'Analytiker', 'Läsbehörighet'].map(r =>
          `<div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
            <span>${r}</span><span class="text-slate-400">konfigurerbar</span></div>`).join('')}`)}
      ${card(`<h2 class="font-semibold mb-3">E-postprovider</h2>
        <div class="text-sm text-slate-500">Faktisk leverans sker via extern provider (t.ex. Amazon SES, Sendgrid, Postmark).
        Verktyget bygger ingen egen SMTP-infrastruktur.</div>
        <div class="mt-3"><span class="badge bg-blue-100 text-blue-700">Provider-adapter (planerad)</span></div>`)}
    </div>`;
};

// ============================================================
// EDITOR (simulerad drag-and-drop)
// ============================================================
VIEWS.editor = (c) => editorView(c);

// init
function loadData() {
  return Promise.all([
    fetch('data/contacts.json').then(r => r.json()),
    fetch('data/campaigns.json').then(r => r.json()),
    fetch('data/app-data.json').then(r => r.json()),
  ]).then(([contacts, campaigns, app]) => {
    DATA = { contacts, campaigns, app };
  });
}

function buildNav() {
  const nav = $('#nav');
  NAV.forEach(item => {
    const a = el(`<a href="#${item.id}" data-id="${item.id}"
      class="nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50">
      <span class="text-lg w-5 text-center">${item.icon}</span>${item.label}</a>`);
    nav.appendChild(a);
  });
}

loadData().then(() => { buildNav(); render(); });
