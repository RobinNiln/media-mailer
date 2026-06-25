// ============================================================
// charts.js – små SVG-grafkomponenter, inga externa bibliotek.
// Returnerar HTML-strängar som kan stoppas in i vyerna.
// Fungerar på GitHub Pages utan byggsteg/CDN.
// ============================================================

// Linjediagram (för trender). series = [{label, value}], color valfri.
function lineChart(series, { width = 520, height = 140, color = '#1d4ed8', fmt = (v) => v } = {}) {
  if (!series.length) return '';
  const pad = { l: 10, r: 10, t: 14, b: 22 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const vals = series.map(s => s.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = (max - min) || 1;
  const x = (i) => pad.l + (i / (series.length - 1 || 1)) * w;
  const y = (v) => pad.t + h - ((v - min) / range) * h;

  const pts = series.map((s, i) => `${x(i)},${y(s.value)}`).join(' ');
  const area = `${pad.l},${pad.t + h} ${pts} ${pad.l + w},${pad.t + h}`;
  const dots = series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.value)}" r="3" fill="${color}"/>`).join('');
  const labels = series.map((s, i) => `<text x="${x(i)}" y="${height - 6}" font-size="9" fill="#94a3b8" text-anchor="middle">${s.label}</text>`).join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:${width}px">
    <polygon points="${area}" fill="${color}" opacity="0.08"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>
    ${dots}${labels}
  </svg>`;
}

// Horisontell tratt (sent -> delivered -> opened -> clicked)
function funnelChart(stages) {
  // stages = [{label, value, color}]
  const max = Math.max(...stages.map(s => s.value)) || 1;
  return `<div class="space-y-2">` + stages.map((s, i) => {
    const w = Math.round((s.value / max) * 100);
    const prev = i > 0 ? stages[i - 1].value : s.value;
    const drop = i > 0 ? (1 - s.value / (prev || 1)) : 0;
    return `<div>
      <div class="flex justify-between text-xs mb-1">
        <span class="font-medium">${s.label}</span>
        <span class="text-slate-500">${fmt(s.value)}${i > 0 ? ` · <span class="text-slate-400">${(s.value / stages[0].value * 100).toFixed(0)}% av skickat</span>` : ''}</span>
      </div>
      <div class="bg-slate-100 rounded-lg overflow-hidden h-7">
        <div class="h-7 rounded-lg flex items-center px-2 text-white text-xs font-medium" style="width:${w}%;background:${s.color}">${w > 12 ? fmt(s.value) : ''}</div>
      </div>
      ${i > 0 && drop > 0 ? `<div class="text-[10px] text-slate-400 mt-0.5">↓ ${(drop * 100).toFixed(0)}% föll bort i detta steg</div>` : ''}
    </div>`;
  }).join('') + `</div>`;
}

// Stapeldiagram (vertikalt) för t.ex. öppningar över tid
function barChart(data, { color = '#1d4ed8', height = 120 } = {}) {
  const max = Math.max(...data.map(d => d.v)) || 1;
  return `<div class="flex items-end gap-2" style="height:${height}px">` +
    data.map(d => {
      const h = Math.round((d.v / max) * (height - 24));
      return `<div class="flex-1 flex flex-col items-center justify-end">
        <div class="text-[10px] text-slate-400">${fmt(d.v)}</div>
        <div class="w-full rounded-t" style="height:${h}px;background:${color};opacity:.85"></div>
        <div class="text-[10px] text-slate-400 mt-1">${d.h}</div>
      </div>`;
    }).join('') + `</div>`;
}

// Horisontella staplar (för block-/länkprestanda)
function hBars(items, { color = '#1d4ed8', valueFmt = (v) => fmt(v) } = {}) {
  const max = Math.max(...items.map(i => i.value)) || 1;
  return `<div class="space-y-2">` + items.map(it => `
    <div>
      <div class="flex justify-between text-xs mb-1"><span class="truncate pr-2">${it.label}</span><span class="text-slate-500 whitespace-nowrap">${valueFmt(it.value)}${it.sub ? ` · ${it.sub}` : ''}</span></div>
      <div class="bg-slate-100 rounded h-2"><div class="h-2 rounded" style="width:${Math.round(it.value / max * 100)}%;background:${color}"></div></div>
    </div>`).join('') + `</div>`;
}

// Liten trendpil mot föregående period
function trendPill(delta, { goodWhenUp = true } = {}) {
  if (delta === 0 || delta == null) return `<span class="text-xs text-slate-400">→ 0%</span>`;
  const up = delta > 0;
  const good = goodWhenUp ? up : !up;
  const color = good ? 'text-emerald-600' : 'text-red-500';
  const arrow = up ? '▲' : '▼';
  return `<span class="text-xs ${color} font-medium">${arrow} ${Math.abs(delta * 100).toFixed(1)}%</span>`;
}
