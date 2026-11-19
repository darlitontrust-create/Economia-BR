window.IE = (() => {
  const loc = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['R$ ', '']});
  const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  // Faixa da meta de inflação do CMN (contínua): centro 3%, tolerância de 1,5 p.p.
  const META = {centro: 3, piso: 1.5, teto: 4.5};
  const UNIT = {selic:'pct', selic_efetiva:'pct', ipca:'pct', ipca_12m:'pct', igpm:'pct', igpm_12m:'pct', dolar:'brl', dolar_mensal:'brl', desemprego:'pct1', ibcbr:'idx', divida_pib:'pct'};
  // +1: subir é bom; -1: subir é ruim; 0: neutro
  const GOOD = {selic:0, selic_efetiva:0, ipca:-1, ipca_12m:-1, igpm:-1, igpm_12m:-1, dolar:0, dolar_mensal:0, desemprego:-1, ibcbr:1, divida_pib:-1};
  const COR = {verde:'#0b8a46', verdeClaro:'#9ed2b8', amarelo:'#f5ecbf', salmao:'#ef9f84', vermelho:'#e0532b', barBom:'#9ed2b8', barRuim:'#f3b9a6', barNeutro:'#c3ccd4'};
  // Faixas de referência dos medidores (escolhidas para leitura rápida; ajuste à vontade)
  const GAUGES = {
    ipca_12m: {min: 0, max: 8, zonas: [[0, 1.5, 'amarelo'], [1.5, 3, 'verde'], [3, 4.5, 'verdeClaro'], [4.5, 6, 'salmao'], [6, 8, 'vermelho']]},
    igpm_12m: {min: -4, max: 12, zonas: [[-4, 0, 'amarelo'], [0, 3, 'verde'], [3, 6, 'verdeClaro'], [6, 9, 'salmao'], [9, 12, 'vermelho']]},
    selic: {min: 0, max: 16, zonas: [[0, 8, 'verde'], [8, 11, 'verdeClaro'], [11, 13, 'amarelo'], [13, 15, 'salmao'], [15, 16, 'vermelho']]},
    dolar: {min: 4, max: 7, zonas: [[4, 5, 'verde'], [5, 5.5, 'verdeClaro'], [5.5, 6, 'amarelo'], [6, 6.5, 'salmao'], [6.5, 7, 'vermelho']]},
    desemprego: {min: 0, max: 14, zonas: [[0, 6, 'verde'], [6, 8, 'verdeClaro'], [8, 10, 'amarelo'], [10, 12, 'salmao'], [12, 14, 'vermelho']]},
    ibcbr: {min: -4, max: 6, zonas: [[-4, -2, 'vermelho'], [-2, 0, 'salmao'], [0, 1.5, 'amarelo'], [1.5, 3, 'verdeClaro'], [3, 6, 'verde']]},
    divida_pib: {min: 60, max: 100, zonas: [[60, 70, 'verde'], [70, 75, 'verdeClaro'], [75, 80, 'amarelo'], [80, 90, 'salmao'], [90, 100, 'vermelho']]},
  };
  // Filtros de Ano e Mês (seleção múltipla; vazio = todos). Valem para gráficos e tabelas.
  const sel = {ano: new Set(), mes: new Set()};
  const f1 = loc.format(',.1f'), f2 = loc.format(',.2f');
  const isNum = (v) => v != null && v !== '' && !isNaN(+v);
  function fmt(v, unit) {
    if (!isNum(v)) return '—';
    v = +v;
    if (unit === 'pct') return f2(v) + '%';
    if (unit === 'pct1') return f1(v) + '%';
    if (unit === 'brl') return 'R$ ' + f2(v);
    return f2(v);
  }
  const varKind = (unit) => (unit === 'brl' || unit === 'idx') ? 'pct' : 'pp';
  function fmtVar(v, kind) {
    if (!isNum(v)) return '—';
    v = +v;
    const s = (v > 0.00005 ? '+' : v < -0.00005 ? '−' : '') + f2(Math.abs(v));
    return kind === 'pct' ? s + '%' : s + ' p.p.';
  }
  const fmtAny = (v, u) => (u && u.indexOf('var-') === 0 ? fmtVar(v, u.slice(4)) : fmt(v, u));
  function curto(v, u) {
    if (!isNum(v)) return '—';
    if (u && u.indexOf('var-') === 0) return fmtVar(v, u.slice(4));
    if (u === 'pct1') return f1(+v) + '%';
    if (u === 'pct') return f2(+v) + '%';
    return f2(+v);
  }
  function tickFmt(v, unit) {
    if (unit === 'brl') return 'R$ ' + f2(v);
    if (unit === 'pct' || unit === 'pct1') return f1(v) + '%';
    return f1(v);
  }
  function fmtRef(s) {
    if (!s) return '—';
    s = String(s);
    if (s.length === 7) return MESES[+s.slice(5, 7) - 1] + '/' + s.slice(0, 4);
    if (s.length === 10) return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
    return s;
  }
  function parseX(s) {
    s = String(s);
    return new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, s.length >= 10 ? +s.slice(8, 10) : 1));
  }
  const shortMonth = (d) => MESES[d.getUTCMonth()] + '/' + String(d.getUTCFullYear()).slice(2);
  const shortDay = (d) => String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
  const porAno = (arr, key) => arr.filter((o) => {
    const s = String(o[key]);
    return (!sel.ano.size || sel.ano.has(s.slice(0, 4))) && (!sel.mes.size || sel.mes.has(s.slice(5, 7)));
  });
  function vazio(el, txt) { const p = document.createElement('p'); p.className = 'k-fail'; p.textContent = txt; el.append(p); }
  function pill(g, cx, cy, txt, escuro) {
    const p = g.append('g').attr('class', 'k-pill');
    const t = p.append('text').attr('x', cx).attr('y', cy).attr('dy', '0.35em').attr('text-anchor', 'middle').text(txt).style('fill', escuro ? '#fff' : '#333');
    const w = t.node().getComputedTextLength() + 10;
    p.insert('rect', 'text').attr('x', cx - w / 2).attr('y', cy - 8).attr('width', w).attr('height', 16).attr('rx', 4)
      .style('fill', escuro ? '#1f1f1f' : '#e4e4e4').style('stroke', escuro ? 'none' : '#cfcfcf');
  }
  function medir(svg, textos, cls) {
    const probe = svg.append('g').attr('class', cls || 'k-pill');
    const longo = textos.reduce((a, b) => (b.length > a.length ? b : a), '');
    const w = probe.append('text').text(longo).node().getComputedTextLength();
    probe.remove();
    return w;
  }
  function tooltip(el, svg, o) {
    // o: {xs, xpos, step, mt, ih, W, H, series:[{name, unit, pts}], daily}
    const tip = document.createElement('div'); tip.className = 'k-tip'; tip.hidden = true; el.append(tip);
    const hl = svg.insert('rect', ':first-child').attr('y', o.mt).attr('height', o.ih).attr('width', o.step).style('fill', 'rgba(0,0,0,.06)').style('display', 'none');
    svg.append('rect').attr('x', 0).attr('y', 0).attr('width', o.W).attr('height', o.H).attr('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [mx] = d3.pointer(ev);
        const i = d3.minIndex(o.xs, (t) => Math.abs(o.xpos(t) - mx));
        const t = o.xs[i], px = o.xpos(t);
        hl.attr('x', px - o.step / 2).style('display', null);
        tip.replaceChildren();
        const h = document.createElement('div'); h.className = 'k-tip-h';
        h.textContent = fmtRef(new Date(t).toISOString().slice(0, o.daily ? 10 : 7)); tip.append(h);
        o.series.forEach((s) => {
          const p = s.pts.find((q) => +q.x === t);
          if (!p) return;
          const row = document.createElement('div');
          row.textContent = (s.name ? s.name + ': ' : '') + fmtAny(p.y, s.unit);
          tip.append(row);
        });
        tip.hidden = false;
        const w = tip.offsetWidth;
        let left = px + 14; if (left + w > o.W) left = px - w - 14; if (left < 0) left = 0;
        tip.style.left = left + 'px'; tip.style.top = o.mt + 'px';
      })
      .on('pointerleave', () => { tip.hidden = true; hl.style('display', 'none'); });
  }

  // Colunas + linha opcional. o.topo = rótulo das colunas fora, acima da coluna
  function combo(el, o) {
    el.replaceChildren();
    const B = o.barras, L = o.linha;
    const xsSet = new Set(B.pts.map((p) => +p.x));
    if (L) L.pts.forEach((p) => xsSet.add(+p.x));
    const xs = Array.from(xsSet).sort((a, b) => a - b);
    if (!xs.length) { vazio(el, 'Sem dados para o filtro escolhido'); return; }
    const W = Math.max(220, el.clientWidth || 600), H = o.h || 300;
    const mt = 14, mb = 30, ml = 4, mr = 4, ih = H - mt - mb;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', o.label || '');
    const x = d3.scaleBand().domain(xs).range([ml, W - mr]).padding(0.2);
    const bw = x.bandwidth(), cxOf = (t) => x(t) + bw / 2, step = x.step();
    const textos = B.pts.map((p) => curto(p.y, B.unit)).concat(L ? L.pts.map((p) => curto(p.y, L.unit)) : []);
    const tw = medir(svg, textos, o.topo ? 'k-blbl' : 'k-pill') + (o.topo ? 6 : 14);
    const xlw = medir(svg, [o.daily ? '00/00' : 'mmm/00'], 'k-xlbl') + 10;
    const sV = Math.max(1, Math.ceil(tw / step)), sX = Math.max(1, Math.ceil(xlw / step));
    const mostra = (i, n, s) => (n - 1 - i) % s === 0;
    const bv = B.pts.map((p) => p.y);
    const blo = Math.min(0, d3.min(bv) ?? 0), bhi = Math.max(0, d3.max(bv) ?? 0);
    const topoB = L ? mt + ih * 0.45 : mt + (o.topo ? 22 : 12);
    const yb = d3.scaleLinear().domain([blo, bhi === blo ? blo + 1 : bhi]).range([H - mb, topoB]);
    const base = yb(0);
    svg.append('g').selectAll('rect').data(B.pts).join('rect')
      .attr('x', (p) => x(+p.x)).attr('width', bw)
      .attr('y', (p) => yb(Math.max(0, p.y))).attr('height', (p) => Math.max(1, Math.abs(yb(p.y) - base)))
      .attr('rx', 2).style('fill', (p) => p.cor);
    if (blo < 0) svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', base).attr('y2', base).style('stroke', '#999');
    const gl = svg.append('g');
    B.pts.forEach((p, i) => {
      if (!mostra(i, B.pts.length, sV)) return;
      if (o.topo) {
        gl.append('text').attr('class', 'k-blbl').attr('x', cxOf(+p.x)).attr('y', p.y >= 0 ? yb(p.y) - 6 : yb(p.y) + 14)
          .attr('text-anchor', 'middle').text(curto(p.y, B.unit));
      } else pill(gl, cxOf(+p.x), p.y >= 0 ? base - 11 : base + 11, curto(p.y, B.unit), false);
    });
    if (L && L.pts.length) {
      let lo = d3.min(L.pts, (p) => p.y), hi = d3.max(L.pts, (p) => p.y);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      const yl = d3.scaleLinear().domain([lo, hi]).range([mt + ih * 0.36, mt + 12]);
      svg.append('path').datum(L.pts).attr('d', d3.line().x((p) => cxOf(+p.x)).y((p) => yl(p.y)))
        .attr('fill', 'none').style('stroke', '#1f1f1f').attr('stroke-width', 2);
      svg.append('g').selectAll('circle').data(L.pts).join('circle')
        .attr('cx', (p) => cxOf(+p.x)).attr('cy', (p) => yl(p.y)).attr('r', bw > 14 ? 4.5 : 3).style('fill', '#1f1f1f');
      const gp = svg.append('g');
      L.pts.forEach((p, i) => { if (mostra(i, L.pts.length, sV)) pill(gp, cxOf(+p.x), yl(p.y) - 14, curto(p.y, L.unit), true); });
    }
    const xl = o.daily ? shortDay : shortMonth;
    xs.forEach((t, i) => {
      if (mostra(i, xs.length, sX)) svg.append('text').attr('class', 'k-xlbl').attr('x', cxOf(t)).attr('y', H - mb + 17).attr('text-anchor', 'middle').text(xl(new Date(t)));
    });
    tooltip(el, svg, {xs, xpos: cxOf, step, mt, ih, W, H, daily: o.daily,
      series: [{name: B.name, unit: B.unit, pts: B.pts}].concat(L ? [{name: L.name, unit: L.unit, pts: L.pts}] : [])});
  }

  // Linha com marcadores, sombra abaixo e rótulo acima de todos os pontos
  let gid = 0;
  function linha(el, o) {
    el.replaceChildren();
    const P = o.pts;
    if (!P.length) { vazio(el, 'Sem dados para o filtro escolhido'); return; }
    const W = Math.max(220, el.clientWidth || 600), H = o.h || 300;
    const mt = 16, mb = 30, ml = 22, mr = 22, ih = H - mt - mb;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', o.label || '');
    const xs = P.map((p) => +p.x);
    const x = d3.scalePoint().domain(xs).range([ml, W - mr]).padding(0.4);
    const step = xs.length > 1 ? x.step() : W - ml - mr;
    const textos = P.map((p) => curto(p.y, o.unit));
    const tw = medir(svg, textos) + 14;
    const xlw = medir(svg, [o.daily ? '00/00' : 'mmm/00'], 'k-xlbl') + 10;
    const sX = Math.max(1, Math.ceil(xlw / step));
    const alterna = tw > step;
    let lo = d3.min(P, (p) => p.y), hi = d3.max(P, (p) => p.y);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.12;
    // Série só com valores positivos: eixo começa no zero
    const base0 = d3.min(P, (p) => p.y) >= 0 ? 0 : lo - pad * 3;
    const y = d3.scaleLinear().domain([base0, hi + pad]).range([H - mb, mt + (alterna ? 40 : 24)]);
    const id = 'kgrad' + (++gid);
    const grad = svg.append('defs').append('linearGradient').attr('id', id).attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
    grad.append('stop').attr('offset', 0).attr('stop-color', '#5fb98f').attr('stop-opacity', 0.45);
    grad.append('stop').attr('offset', 1).attr('stop-color', '#5fb98f').attr('stop-opacity', 0.02);
    const xp = (p) => x(+p.x);
    svg.append('path').datum(P).attr('d', d3.area().x(xp).y0(H - mb).y1((p) => y(p.y))).attr('fill', `url(#${id})`);
    svg.append('path').datum(P).attr('d', d3.line().x(xp).y((p) => y(p.y))).attr('fill', 'none').style('stroke', '#1f1f1f').attr('stroke-width', 2);
    svg.append('g').selectAll('circle').data(P).join('circle').attr('cx', xp).attr('cy', (p) => y(p.y))
      .attr('r', 4).style('fill', '#fff').style('stroke', '#1f1f1f').attr('stroke-width', 2);
    const gp = svg.append('g');
    P.forEach((p, i) => pill(gp, xp(p), y(p.y) - (alterna && i % 2 ? 32 : 15), curto(p.y, o.unit), true));
    const xl = o.daily ? shortDay : shortMonth;
    xs.forEach((t, i) => {
      if ((xs.length - 1 - i) % sX === 0) svg.append('text').attr('class', 'k-xlbl').attr('x', x(t)).attr('y', H - mb + 17).attr('text-anchor', 'middle').text(xl(new Date(t)));
    });
    tooltip(el, svg, {xs, xpos: (t) => x(t), step, mt, ih, W, H, daily: o.daily, series: [{name: o.name, unit: o.unit, pts: P}]});
  }

  // Medidor semicircular com faixas coloridas e ponteiro
  function gauge(el, v, cfg, unit, label) {
    el.replaceChildren();
    if (!cfg) return;
    const W = Math.max(180, el.clientWidth || 300);
    const r = Math.max(70, Math.min(W / 2 - 34, 150));
    const H = r + 34;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img').attr('aria-label', label + (isNum(v) ? ': ' + fmt(v, unit) : ''));
    const g = svg.append('g').attr('transform', `translate(${W / 2},${r + 8})`);
    const a = d3.scaleLinear().domain([cfg.min, cfg.max]).range([-Math.PI / 2, Math.PI / 2]).clamp(true);
    const arc = d3.arc().innerRadius(r * 0.62).outerRadius(r);
    cfg.zonas.forEach(([z0, z1, c]) => g.append('path').attr('d', arc({startAngle: a(z0), endAngle: a(z1)})).style('fill', COR[c]));
    g.append('path').attr('d', d3.arc().innerRadius(r * 0.13).outerRadius(r * 0.2)({startAngle: -Math.PI / 2 - 0.5, endAngle: Math.PI / 2 + 0.5})).style('fill', '#222');
    if (isNum(v)) {
      const ang = a(+v), len = r * 0.97;
      g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', Math.sin(ang) * len).attr('y2', -Math.cos(ang) * len)
        .style('stroke', '#222').attr('stroke-width', 3.5).attr('stroke-linecap', 'round');
      g.append('circle').attr('r', 5).style('fill', '#222');
    }
    g.append('text').attr('class', 'k-glbl').attr('x', -r * 0.81).attr('y', 20).attr('text-anchor', 'middle').text(tickFmt(cfg.min, unit));
    g.append('text').attr('class', 'k-glbl').attr('x', r * 0.81).attr('y', 20).attr('text-anchor', 'middle').text(tickFmt(cfg.max, unit));
  }

  return {META, UNIT, GOOD, COR, GAUGES, MESES, fmt, fmtVar, fmtAny, varKind, fmtRef, parseX, isNum, porAno, combo, linha, gauge, vazio,
    getSel: (k) => sel[k], setSel: (k, s) => { sel[k] = s; }};
})();
