// Motor do painel: busca os dados do Banco Central ao abrir, guarda em memória
// e redesenha os visuais. Se a busca on-line falhar, usa a cópia salva em data/.
(() => {
  const RAW = {}, calcs = {}, draws = {}, onDataFns = [];
  let cache = {}, status = 'loading';
  const visivel = (el) => !el.closest('[hidden]');

  function data(id) {
    if (calcs[id]) {
      if (status !== 'ok') return {status, data: null};
      if (!(id in cache)) { const c = calcs[id]; cache[id] = c.fn(...c.inputs.map((i) => data(i).data)); }
      return {status: 'ok', data: cache[id]};
    }
    if (status !== 'ok') return {status, data: []};
    return {status: 'ok', data: RAW[id] || []};
  }
  function run(name) {
    document.querySelectorAll(name ? `[data-draw="${name}"]` : '[data-draw]').forEach((el) => {
      const f = draws[el.dataset.draw];
      if (f && visivel(el)) { try { f(el); } catch (e) { console.error(e); } }
    });
  }
  function runAll() {
    onDataFns.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    run();
  }
  window.dash = {
    data,
    calc: (id, o) => { calcs[id] = o; },
    draw: (n, f) => { if (f) draws[n] = f; else run(n); },
    onData: (f) => onDataFns.push(f),
    colors: ['#333'],
    setLink: (id) => { try { history.replaceState(null, '', '#' + id); } catch (e) {} },
  };

  // Redesenha ao trocar de tela e ao redimensionar a janela
  new MutationObserver((muts) => {
    if (muts.some((m) => m.target.classList && m.target.classList.contains('k-page') && !m.target.hidden)) run();
  }).observe(document.documentElement, {subtree: true, attributes: true, attributeFilter: ['hidden']});
  let tmr;
  window.addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(run, 200); });

  // ---------- Aviso de atualização ----------
  let toastTmr;
  function aviso(tipo, msg, fixo) {
    const t = document.getElementById('k-toast');
    if (!t) return;
    clearTimeout(toastTmr);
    t.className = 'k-toast k-toast-' + tipo;
    t.querySelector('.k-toast-msg').textContent = msg;
    t.hidden = false;
    if (!fixo) toastTmr = setTimeout(() => { t.hidden = true; }, 6000);
  }

  // ---------- Busca no Banco Central (API SGS) ----------
  const SERIES = {selic: 4189, ipca: 433, ipca_12m: 13522, igpm: 189, dolar: 3698, desemprego: 24369, ibcbr: 24364, divida_pib: 13762};
  const p2 = (n) => String(n).padStart(2, '0');
  const fmtBR = (d) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const iso = (s) => s.slice(6, 10) + '-' + s.slice(3, 5) + '-' + s.slice(0, 2);
  async function sgs(cod, ini, fim) {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados?formato=json&dataInicial=${fmtBR(ini)}&dataFinal=${fmtBR(fim)}`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(url, {cache: 'no-store', signal: ctrl.signal});
      if (!r.ok) throw new Error(`série ${cod}: HTTP ${r.status}`);
      const j = await r.json();
      if (!Array.isArray(j)) throw new Error(`série ${cod}: resposta inesperada`);
      return j;
    } finally { clearTimeout(to); }
  }
  async function buscarAoVivo() {
    const hoje = new Date();
    const ini = new Date(hoje.getFullYear() - 2, 0, 1);
    const dIni = new Date(hoje); dIni.setDate(dIni.getDate() - 45);
    const [mensais, meta, diario] = await Promise.all([
      Promise.all(Object.entries(SERIES).map(async ([k, c]) => [k, await sgs(c, ini, hoje)])),
      sgs(432, ini, hoje),
      sgs(1, dIni, hoje),
    ]);
    const porMes = {};
    mensais.forEach(([k, arr]) => arr.forEach((o) => {
      const m = iso(o.data).slice(0, 7);
      (porMes[m] = porMes[m] || {mes: m})[k] = +o.valor;
    }));
    const periodos = [];
    meta.forEach((o) => {
      const d = iso(o.data), v = +o.valor, u = periodos[periodos.length - 1];
      if (u && u.meta === v) u.fim = d; else periodos.push({inicio: d, fim: d, meta: v});
    });
    const ptax = diario.map((o) => ({data: iso(o.data), ptax: +o.valor}));
    const agora = new Date();
    return {
      mensal: Object.values(porMes).sort((a, b) => (a.mes < b.mes ? -1 : 1)),
      selic_meta: periodos,
      dolar_diario: ptax,
      atualizacao: [{data: `${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}`,
        hora: `${p2(agora.getHours())}:${p2(agora.getMinutes())}`,
        dados_ate: ptax.length ? ptax[ptax.length - 1].data : ''}],
    };
  }
  async function lerCopiaSalva() {
    const nomes = ['mensal', 'selic_meta', 'dolar_diario', 'atualizacao'];
    const out = {};
    await Promise.all(nomes.map(async (n) => {
      const r = await fetch(`data/${n}.json`, {cache: 'no-store'});
      const j = await r.json();
      out[n] = Array.isArray(j) ? j : j.rows;
    }));
    return out;
  }

  // Lista de anos do filtro conforme os dados carregados
  function montarAnos() {
    const anos = Array.from(new Set((RAW.mensal || []).map((r) => r.mes.slice(0, 4)))).sort().reverse();
    document.querySelectorAll("[data-slicer='ano'] .k-pop").forEach((pop) => {
      pop.querySelectorAll('.k-opt:not([data-v="todos"])').forEach((b) => b.remove());
      const hint = pop.querySelector('.k-hint');
      anos.forEach((a) => {
        const b = document.createElement('button');
        b.className = 'k-opt'; b.dataset.v = a; b.textContent = a;
        pop.insertBefore(b, hint);
      });
    });
  }

  let rodando = false;
  async function atualizar() {
    if (rodando) return;
    rodando = true;
    const btn = document.getElementById('k-refresh');
    if (btn) btn.disabled = true;
    aviso('info', 'Atualizando dados do Banco Central…', true);
    let novos, aoVivo = true, erro = null;
    try { novos = await buscarAoVivo(); } catch (e) { erro = e; aoVivo = false; }
    if (!aoVivo) {
      try { novos = await lerCopiaSalva(); } catch (e) { novos = null; }
    }
    if (novos) {
      Object.assign(RAW, novos);
      cache = {};
      status = 'ok';
      montarAnos();
      runAll();
      if (window.IEnav) window.IEnav.aplicar();
      const a = RAW.atualizacao && RAW.atualizacao[0];
      const quando = a ? `${IE.fmtRef(a.data)} às ${a.hora}` : '';
      if (aoVivo) aviso('ok', `Dados atualizados em ${quando}`);
      else aviso('warn', `Não foi possível buscar on-line agora. Exibindo a cópia salva de ${quando}.`);
      if (erro) console.warn('Busca on-line falhou:', erro);
    } else {
      status = 'error';
      runAll();
      aviso('erro', 'Não foi possível carregar os dados. Tente novamente em instantes.', true);
    }
    if (btn) btn.disabled = false;
    rodando = false;
  }
  window.IEdados = {atualizar};

  window.addEventListener('DOMContentLoaded', () => {
    runAll();
    const btn = document.getElementById('k-refresh');
    if (btn) btn.addEventListener('click', atualizar);
    const t = document.getElementById('k-toast');
    if (t) t.addEventListener('click', () => { t.hidden = true; });
    atualizar();
  });
})();
