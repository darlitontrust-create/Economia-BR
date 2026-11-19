dash.calc('derivados', {
  inputs: ['mensal'],
  title: 'Variações calculadas',
  description: 'IGP-M acumulado em 12 meses (composição das taxas mensais), IBC-Br em 12 meses e variação de cada indicador frente ao mês anterior.',
  fn: (mensal) => {
    const num = (v) => (v == null || v === '' || isNaN(+v)) ? null : +v;
    const r4 = (v) => v == null ? null : Math.round(v * 10000) / 10000;
    const rows = mensal.slice().sort((a, b) => (a.mes < b.mes ? -1 : 1));
    const campos = ['selic', 'ipca', 'ipca_12m', 'igpm', 'dolar', 'desemprego', 'ibcbr', 'divida_pib'];
    const emPct = {dolar: true, ibcbr: true};
    const out = rows.map((r, i) => {
      const o = {mes: r.mes};
      const janela = i >= 11 ? rows.slice(i - 11, i + 1).map((x) => num(x.igpm)) : null;
      o.igpm_12m = janela && janela.every((v) => v != null) ? r4((janela.reduce((p, v) => p * (1 + v / 100), 1) - 1) * 100) : null;
      const base = i >= 12 ? num(rows[i - 12].ibcbr) : null, atual = num(r.ibcbr);
      o.ibcbr_12m = base != null && atual != null ? r4((atual / base - 1) * 100) : null;
      const prev = i > 0 ? rows[i - 1] : null;
      campos.forEach((k) => {
        const a = prev ? num(prev[k]) : null, v = num(r[k]);
        o['d_' + k] = a == null || v == null ? null : r4(emPct[k] ? (v / a - 1) * 100 : v - a);
      });
      return o;
    });
    out.forEach((o, i) => {
      const p = i > 0 ? out[i - 1].igpm_12m : null;
      o.d_igpm_12m = p == null || o.igpm_12m == null ? null : r4(o.igpm_12m - p);
    });
    return out;
  }
});

dash.calc('resumo', {
  inputs: ['mensal', 'derivados', 'selic_meta', 'dolar_diario'],
  title: 'Resumo dos indicadores',
  description: 'Último valor de cada indicador, o valor anterior, o de 12 meses antes e o mínimo e máximo desde jan/2024.',
  fn: (mensal, derivados, selicMeta, dolarDiario) => {
    const num = (v) => (v == null || v === '' || isNaN(+v)) ? null : +v;
    const r4 = (v) => v == null ? null : Math.round(v * 10000) / 10000;
    const serie = (rows, campo) => rows.slice().sort((a, b) => (a.mes < b.mes ? -1 : 1))
      .filter((r) => num(r[campo]) != null).map((r) => ({ref: r.mes, v: num(r[campo])}));
    const dif = (a, b, pct) => (a == null || b == null) ? null : r4(pct ? (a / b - 1) * 100 : a - b);
    const resumir = (id, s, pct) => {
      if (!s.length) return {id};
      const n = s.length, u = s[n - 1], a = s[n - 2], b = s[n - 13];
      const mn = s.reduce((m, p) => (p.v < m.v ? p : m)), mx = s.reduce((m, p) => (p.v > m.v ? p : m));
      return {id, valor: u.v, ref: u.ref, ant: a ? a.v : null, ref_ant: a ? a.ref : null, var: a ? dif(u.v, a.v, pct) : null,
        a12: b ? b.v : null, ref_a12: b ? b.ref : null, var12: b ? dif(u.v, b.v, pct) : null,
        min: mn.v, min_ref: mn.ref, max: mx.v, max_ref: mx.ref};
    };
    const out = [
      resumir('ipca_12m', serie(mensal, 'ipca_12m')),
      resumir('ipca', serie(mensal, 'ipca')),
      resumir('igpm_12m', serie(derivados, 'igpm_12m')),
      resumir('igpm', serie(mensal, 'igpm')),
      resumir('dolar_mensal', serie(mensal, 'dolar'), true),
      resumir('desemprego', serie(mensal, 'desemprego')),
      resumir('ibcbr', serie(mensal, 'ibcbr'), true),
      resumir('divida_pib', serie(mensal, 'divida_pib')),
      resumir('selic_efetiva', serie(mensal, 'selic')),
    ];
    // Meta Selic: períodos de vigência das decisões do Copom
    const p = selicMeta.slice().sort((a, b) => (a.inicio < b.inicio ? -1 : 1)).map((r) => ({inicio: r.inicio, fim: r.fim, v: num(r.meta)}));
    if (p.length) {
      const u = p[p.length - 1], a = p[p.length - 2];
      const umAnoAntes = (Number(u.fim.slice(0, 4)) - 1) + u.fim.slice(4);
      const em = p.find((q) => q.inicio <= umAnoAntes && q.fim >= umAnoAntes);
      const mn = p.reduce((m, q) => (q.v < m.v ? q : m)), mx = p.reduce((m, q) => (q.v > m.v ? q : m));
      out.push({id: 'selic', valor: u.v, ref: u.inicio, ant: a ? a.v : null, ref_ant: a ? a.inicio : null, var: a ? dif(u.v, a.v) : null,
        a12: em ? em.v : null, ref_a12: em ? umAnoAntes : null, var12: em ? dif(u.v, em.v) : null,
        min: mn.v, min_ref: mn.inicio, max: mx.v, max_ref: mx.inicio});
    }
    // Dólar: último PTAX diário comparado à média do último mês fechado e à de 12 meses antes
    const d = dolarDiario.slice().sort((a, b) => (a.data < b.data ? -1 : 1)).filter((r) => num(r.ptax) != null);
    const m = serie(mensal, 'dolar');
    if (d.length) {
      const u = d[d.length - 1], a = m[m.length - 1], b = m[m.length - 13];
      const mn = d.reduce((x, q) => (+q.ptax < +x.ptax ? q : x)), mx = d.reduce((x, q) => (+q.ptax > +x.ptax ? q : x));
      out.push({id: 'dolar', valor: num(u.ptax), ref: u.data, ant: a ? a.v : null, ref_ant: a ? a.ref : null, var: a ? dif(num(u.ptax), a.v, true) : null,
        a12: b ? b.v : null, ref_a12: b ? b.ref : null, var12: b ? dif(num(u.ptax), b.v, true) : null,
        min: num(mn.ptax), min_ref: mn.data, max: num(mx.ptax), max_ref: mx.data});
    }
    return out;
  }
});
