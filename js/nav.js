(() => {
  let atual = 'capa';
  const TRI = {'1': ['01', '02', '03'], '2': ['04', '05', '06'], '3': ['07', '08', '09'], '4': ['10', '11', '12']};
  const mostrar = (id, rolar) => {
    const secs = Array.from(document.querySelectorAll('.k-page'));
    if (!secs.length) return;
    if (!secs.some((s) => s.id === id)) id = 'capa';
    atual = id;
    secs.forEach((s) => { s.hidden = s.id !== id; });
    document.querySelectorAll('.k-item').forEach((b) => {
      if (b.dataset.goto === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    try { dash.setLink(id); } catch (e) {}
    if (rolar) { const root = document.getElementById('dash-root'); if (root && root.scrollIntoView) root.scrollIntoView({block: 'start'}); }
  };
  const fecharTodos = () => {
    document.querySelectorAll('.k-pop').forEach((p) => { p.hidden = true; });
    document.querySelectorAll('.k-sbtn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  };
  // Marca nas listas de todas as telas o que está selecionado
  const sincronizar = () => {
    ['ano', 'mes'].forEach((k) => {
      const s = IE.getSel(k);
      document.querySelectorAll(`[data-slicer='${k}'] .k-opt`).forEach((o) => {
        let on;
        o.classList.remove('k-part');
        if (o.dataset.v === 'todos') on = s.size === 0;
        else if (o.dataset.tri) {
          const n = TRI[o.dataset.tri].filter((m) => s.has(m)).length;
          on = n === 3;
          if (n > 0 && n < 3) o.classList.add('k-part');
        } else on = s.has(o.dataset.v);
        o.classList.toggle('k-on', on);
        o.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    });
  };
  const aplicar = () => {
    sincronizar();
    ['fresumo', 'combo', 'linha', 'tabela', 'diario'].forEach((n) => dash.draw(n));
  };
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;
    const btn = t.closest('.k-sbtn');
    if (btn) {
      const pop = btn.parentElement.querySelector('.k-pop');
      const abrir = pop.hidden;
      fecharTodos();
      pop.hidden = !abrir;
      btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      return;
    }
    const exp = t.closest('.k-exp');
    if (exp) {
      const box = exp.closest('.k-pop').querySelector(`.k-meses[data-tri='${exp.dataset.tri}']`);
      box.hidden = !box.hidden;
      exp.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
      exp.classList.toggle('k-open', !box.hidden);
      return;
    }
    const opt = t.closest('.k-opt');
    if (opt) {
      // Clique: escolhe só este item (de novo: volta a Todos). Ctrl/Cmd + clique: soma ou tira da seleção
      const kind = opt.closest('[data-slicer]').dataset.slicer;
      const s = new Set(IE.getSel(kind));
      const multi = ev.ctrlKey || ev.metaKey;
      const vals = opt.dataset.v === 'todos' ? null : opt.dataset.tri ? TRI[opt.dataset.tri] : [opt.dataset.v];
      let novo;
      if (!vals) novo = new Set();
      else if (multi) {
        const todos = vals.every((v) => s.has(v));
        vals.forEach((v) => (todos ? s.delete(v) : s.add(v)));
        novo = s;
      } else {
        const igual = s.size === vals.length && vals.every((v) => s.has(v));
        novo = igual ? new Set() : new Set(vals);
      }
      IE.setSel(kind, novo);
      aplicar();
      return;
    }
    if (!t.closest('.k-pop')) fecharTodos();
    const alvo = t.closest('[data-goto]');
    if (!alvo) return;
    ev.preventDefault();
    mostrar(alvo.dataset.goto, true);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fecharTodos(); });
  window.addEventListener('beforeprint', () => document.querySelectorAll('.k-page').forEach((s) => { s.hidden = false; }));
  window.addEventListener('afterprint', () => mostrar(atual, false));
  // Tela cheia: o botão alterna entre ampliar e voltar
  const btnFull = document.getElementById('k-full');
  if (btnFull) {
    const docEl = document.documentElement;
    const emTelaCheia = () => document.fullscreenElement || document.webkitFullscreenElement;
    const suporta = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (!suporta) btnFull.hidden = true;
    const atualizarBotao = () => {
      const on = !!emTelaCheia();
      btnFull.classList.toggle('k-ativo', on);
      btnFull.querySelector('.k-full-txt').textContent = on ? 'Sair da tela cheia' : 'Tela cheia';
      btnFull.title = on ? 'Voltar ao tamanho normal' : 'Ver o painel em tela cheia';
    };
    btnFull.addEventListener('click', () => {
      if (emTelaCheia()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (docEl.requestFullscreen || docEl.webkitRequestFullscreen).call(docEl);
    });
    document.addEventListener('fullscreenchange', atualizarBotao);
    document.addEventListener('webkitfullscreenchange', atualizarBotao);
  }
  window.IEnav = {aplicar};
  sincronizar();
  const h = (location.hash || '').replace('#', '');
  mostrar(h || 'capa', false);
})();
