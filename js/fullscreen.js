// Botão de tela cheia: mesmo efeito do F11 (a página ocupa a tela toda) e, ativo, vira "Reduzir tela".
(() => {
  const btn = document.getElementById('k-full');
  if (!btn) return;
  btn.classList.add('k-full');
  const docEl = document.documentElement;
  const pedir = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
  const sair = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  const ativo = () => !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  if (!pedir) { btn.hidden = true; return; }
  const txt = btn.querySelector('.k-full-txt');
  const sincronizar = () => {
    const on = ativo();
    btn.classList.toggle('k-ativo', on);
    txt.textContent = on ? 'Reduzir tela' : 'Tela cheia';
    btn.title = on ? 'Voltar ao tamanho normal (Esc)' : 'Ver o painel em tela cheia (como F11)';
  };
  btn.addEventListener('click', async () => {
    try {
      if (ativo()) await sair.call(document);
      else await pedir.call(docEl, {navigationUI: 'hide'});
    } catch (e) {
      console.warn('Tela cheia indisponível:', e);
    }
    sincronizar();
  });
  ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach((ev) => document.addEventListener(ev, sincronizar));
  sincronizar();
})();
