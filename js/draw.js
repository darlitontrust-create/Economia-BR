(() => {
  const busy = (el, st) => el.classList.toggle('dash-skeleton', st === 'loading');
  const spec = (s) => { const [src, campo, unit] = s.split(':'); return {src, campo, unit}; };

  // Cor dos cartões (verde = melhorou, salmão = piorou) conforme a variação indicada em data-tone
  dash.onData(() => {
    const r = dash.data('resumo');
    document.querySelectorAll('[data-tone]').forEach((t) => {
      t.classList.remove('k-good', 'k-bad');
      if (r.status !== 'ok') return;
      const [id, f] = t.dataset.tone.split(':');
      const row = r.data.find((x) => x.id === id);
      const v = row ? row[f] : null, g = IE.GOOD[id];
      if (g && IE.isNum(v) && Math.abs(v) > 0.00005) t.classList.add(v * g > 0 ? 'k-good' : 'k-bad');
    });
  });

  dash.draw('num', (el) => {
    const r = dash.data('resumo');
    busy(el, r.status);
    if (r.status !== 'ok') { el.textContent = '—'; return; }
    const id = (el.dataset.where || '').replace('id=', ''), f = el.dataset.field;
    const row = r.data.find((x) => x.id === id);
    const v = row ? row[f] : null, unit = IE.UNIT[id];
    if (f === 'var' || f === 'var12') el.textContent = IE.fmtVar(v, IE.varKind(unit));
    else if (f.indexOf('ref') >= 0) el.textContent = IE.fmtRef(v);
    else el.textContent = IE.fmt(v, unit);
  });

  // Selo da capa: data e hora da última atualização geral dos dados
  dash.draw('atual', (el) => {
    const a = dash.data('atualizacao');
    busy(el, a.status);
    const row = a.status === 'ok' ? a.data[0] : null;
    if (!row) { el.textContent = '—'; return; }
    const f = el.dataset.field;
    el.textContent = f === 'hora' ? String(row.hora || '—') : IE.fmtRef(row[f]);
  });

  dash.draw('metafrase', (el) => {
    const r = dash.data('resumo');
    busy(el, r.status);
    if (r.status !== 'ok') { el.textContent = '—'; return; }
    const row = r.data.find((x) => x.id === 'ipca_12m');
    const v = row ? row.valor : null, M = IE.META;
    const f = (n) => IE.fmt(n, 'pct');
    if (!IE.isNum(v)) el.textContent = '—';
    else if (v > M.teto) el.textContent = 'acima do teto da meta (' + f(M.teto) + ')';
    else if (v < M.piso) el.textContent = 'abaixo do piso da meta (' + f(M.piso) + ')';
    else if (v > M.centro) el.textContent = 'acima do centro da meta (' + f(M.centro) + '), mas dentro do teto de ' + f(M.teto);
    else el.textContent = 'dentro da meta, abaixo do centro de ' + f(M.centro);
  });

  // Texto do botão de cada filtro: Todos, o item escolhido ou quantos foram escolhidos
  const TRI = {'1': ['01', '02', '03'], '2': ['04', '05', '06'], '3': ['07', '08', '09'], '4': ['10', '11', '12']};
  dash.draw('fresumo', (el) => {
    const k = el.dataset.slicer, s = IE.getSel(k);
    if (!s.size) { el.textContent = 'Todos'; return; }
    const vals = Array.from(s).sort();
    if (k === 'mes') {
      const tri = Object.keys(TRI).find((t) => TRI[t].length === vals.length && TRI[t].every((m) => s.has(m)));
      if (tri) { el.textContent = tri + 'º trimestre'; return; }
      if (vals.length === 1) { el.textContent = IE.MESES[+vals[0] - 1]; return; }
    } else if (vals.length === 1) { el.textContent = vals[0]; return; }
    el.textContent = vals.length + (k === 'mes' ? ' meses' : ' anos');
  });

  dash.draw('combo', (el) => {
    const xk = el.dataset.x || 'mes';
    const bs = spec(el.dataset.barras), ls = el.dataset.linha ? spec(el.dataset.linha) : null;
    const db = dash.data(bs.src), dl = ls ? dash.data(ls.src) : null;
    const st = [db.status, dl ? dl.status : 'ok'];
    busy(el, st.includes('loading') ? 'loading' : 'ok');
    if (st.some((s) => s !== 'ok')) {
      el.replaceChildren();
      if (st.some((s) => s === 'error' || s === 'missing')) IE.vazio(el, 'Falha ao carregar');
      return;
    }
    const g = IE.GOOD[el.dataset.good] || 0, modo = el.dataset.cor || 'var';
    const ord = (rows, c) => rows.filter((r) => IE.isNum(r[c])).slice().sort((a, b) => (a[xk] < b[xk] ? -1 : 1));
    const br = ord(db.data, bs.campo);
    const pts = IE.porAno(br.map((r, i) => {
      const y = +r[bs.campo];
      let s = 0;
      if (modo === 'sinal') s = Math.sign(y) * (g || 1);
      else if (i > 0) s = Math.sign(y - +br[i - 1][bs.campo]) * g;
      const cor = !g && modo !== 'sinal' ? IE.COR.barNeutro : s < 0 ? IE.COR.barRuim : IE.COR.barBom;
      return {x: IE.parseX(r[xk]), y, cor, key: r[xk]};
    }), 'key');
    const lp = ls ? IE.porAno(ord(dl.data, ls.campo).map((r) => ({x: IE.parseX(r[xk]), y: +r[ls.campo], key: r[xk]})), 'key') : null;
    IE.combo(el, {
      barras: {pts, unit: bs.unit, name: el.dataset.nb || ''},
      linha: ls ? {pts: lp, unit: ls.unit, name: el.dataset.nl || ''} : null,
      topo: el.dataset.topo === '1', daily: xk === 'data', label: el.getAttribute('aria-label') || '',
    });
  });

  dash.draw('linha', (el) => {
    const xk = el.dataset.x || 'mes';
    const s = spec(el.dataset.serie), d = dash.data(s.src);
    busy(el, d.status);
    if (d.status !== 'ok') {
      el.replaceChildren();
      if (d.status === 'error' || d.status === 'missing') IE.vazio(el, 'Falha ao carregar');
      return;
    }
    const pts = IE.porAno(d.data.filter((r) => IE.isNum(r[s.campo])).map((r) => ({x: IE.parseX(r[xk]), y: +r[s.campo], key: r[xk]}))
      .sort((a, b) => a.x - b.x), 'key');
    IE.linha(el, {pts, unit: s.unit, name: el.dataset.nome || '', daily: xk === 'data', label: el.getAttribute('aria-label') || ''});
  });

  dash.draw('gauge', (el) => {
    const r = dash.data('resumo');
    busy(el, r.status);
    if (r.status !== 'ok') { el.replaceChildren(); return; }
    const id = el.dataset.id, f = el.dataset.f || 'valor';
    const row = r.data.find((x) => x.id === id);
    IE.gauge(el, row ? row[f] : null, IE.GAUGES[el.dataset.g || id], el.dataset.unit || IE.UNIT[id], el.getAttribute('aria-label') || '');
  });

  dash.draw('tabela', (tb) => {
    const m = dash.data('mensal'), dv = dash.data('derivados');
    if (m.status !== 'ok') { tb.replaceChildren(); return; }
    const dmap = new Map((dv.status === 'ok' ? dv.data : []).map((r) => [r.mes, r]));
    const cols = tb.dataset.cols.split(',').map(spec);
    const good = +(tb.dataset.good || 0);
    const val = (r, c) => (c.src === 'm' ? r[c.campo] : (dmap.get(r.mes) || {})[c.campo]);
    const rows = IE.porAno(m.data.slice().sort((a, b) => (a.mes < b.mes ? 1 : -1)).filter((r) => IE.isNum(val(r, cols[0]))), 'mes');
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.mes;
      const td0 = document.createElement('td'); td0.textContent = IE.fmtRef(r.mes); tr.append(td0);
      cols.forEach((c) => {
        const td = document.createElement('td'), v = val(r, c);
        if (c.unit.indexOf('var') === 0) {
          td.textContent = IE.fmtVar(v, c.unit.slice(4));
          if (good && IE.isNum(v) && Math.abs(v) > 0.00005) td.className = v * good > 0 ? 'k-good' : 'k-bad';
        } else td.textContent = IE.fmt(v, c.unit);
        tr.append(td);
      });
      return tr;
    }));
  });

  dash.draw('copom', (tb) => {
    const s = dash.data('selic_meta');
    if (s.status !== 'ok') { tb.replaceChildren(); return; }
    const rows = s.data.slice().sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.inicio;
      [IE.fmtRef(r.inicio), IE.fmtRef(r.fim), IE.fmt(r.meta, 'pct')].forEach((t) => { const td = document.createElement('td'); td.textContent = t; tr.append(td); });
      return tr;
    }));
  });

  dash.draw('diario', (tb) => {
    const s = dash.data('dolar_diario');
    if (s.status !== 'ok') { tb.replaceChildren(); return; }
    const rows = IE.porAno(s.data.slice().sort((a, b) => (a.data < b.data ? 1 : -1)), 'data');
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.data;
      [IE.fmtRef(r.data), IE.fmt(r.ptax, 'brl')].forEach((t) => { const td = document.createElement('td'); td.textContent = t; tr.append(td); });
      return tr;
    }));
  });
})();
