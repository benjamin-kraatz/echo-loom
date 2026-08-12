import './style.css';
import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');

const ui = {
  title: document.getElementById('title-screen'),
  hud: document.getElementById('hud'),
  win: document.getElementById('win-screen'),
  banner: document.getElementById('level-banner'),
  bannerKicker: document.getElementById('banner-kicker'),
  bannerTitle: document.getElementById('banner-title'),
  roomLabel: document.getElementById('room-label'),
  starsAwake: document.getElementById('stars-awake'),
  starsTotal: document.getElementById('stars-total'),
  hint: document.getElementById('touch-hint'),
  btnStart: document.getElementById('btn-start'),
  btnAgain: document.getElementById('btn-again'),
  safariTip: document.getElementById('safari-tip'),

  hideTitle() {
    this.title.classList.remove('active');
    this.title.classList.add('hidden');
    this.hideSafariTip();
  },
  hideSafariTip() {
    if (this.safariTip) this.safariTip.classList.add('hidden');
  },
  showHud() {
    this.hud.classList.remove('hidden');
  },
  hideHud() {
    this.hud.classList.add('hidden');
  },
  showWin() {
    this.win.classList.remove('hidden');
    this.win.classList.add('active');
  },
  hideWin() {
    this.win.classList.add('hidden');
    this.win.classList.remove('active');
  },
  setRoom(name) {
    this.roomLabel.textContent = name;
  },
  setStars(awake, total) {
    this.starsAwake.textContent = String(awake);
    this.starsTotal.textContent = String(total);
  },
  showHint(on) {
    this.hint.classList.toggle('hidden', !on);
  },
  showBanner(kicker, title) {
    this.bannerKicker.textContent = kicker;
    this.bannerTitle.textContent = title;
    this.banner.classList.remove('hidden');
  },
  hideBanner() {
    this.banner.classList.add('hidden');
  },
};

document.body.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

const game = new Game(canvas, ui);
window.__echoLoomGame = game;

async function boot() {
  await game.init();
  game.renderer.render(game.scene, game.camera);

  if (new URLSearchParams(location.search).has('autotest')) {
    document.documentElement.dataset.echo = 'booted';
    await new Promise((r) => setTimeout(r, 200));
    await game.start();
    document.documentElement.dataset.echo = 'started';

    // Verified pulse solutions per chamber (aim xyz + curve xyz)
    const solutions = [
      [
        [-1, 1.9, -4.5, -2.5, -0.5, 0],
        [-3.8, 0.8, -3.2, 0, 2.5, 0],
        [1.8, 1, -3.5, 1.5, 2, 0],
      ],
      [
        [-1, 2.2, -5.5, -2.5, -0.5, 0],
        [-4.8, 1.7, -2.5, -2.5, -0.5, 0],
        [2.8, 1.5, -3, -2.5, -0.5, 0],
        [1, 0.4, -6.2, -2, -0.5, 0],
      ],
      [
        [-4.5, 1.4, -3, -2.5, -0.5, 0],
        [2.5, 2.3, -2.8, -2.5, -0.5, 0],
        [-1, 3.6, -6, -1.5, -0.5, 0],
        [1.8, 1.9, -5.8, -2, 1, 0],
        [-3.5, 1.5, -6.2, -1, -0.5, 0],
      ],
    ];

    for (let li = 0; li < solutions.length; li++) {
      // Wait until this chamber is active
      for (let guard = 0; guard < 40 && (game.levelIndex !== li || game.transitioning); guard++) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!game.running && li > 0) break;
      const shots = solutions[li];
      // Fire solutions, then retry any leftovers twice
      const queue = [...shots, ...shots, ...shots];
      for (const c of queue) {
        if (game.levelIndex !== li || game.stars.allAwake() || game.transitioning) break;
        game.aimWorld.set(c[0], c[1], c[2]);
        game.curveOffset.set(c[3], c[4], c[5]);
        game._castPulse();
        await new Promise((r) => setTimeout(r, 1300));
      }
      // Allow clear banner + advance
      for (let guard = 0; guard < 30 && game.levelIndex === li; guard++) {
        await new Promise((r) => setTimeout(r, 200));
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    const won = !document.getElementById('win-screen').classList.contains('hidden');
    document.title = `ECHOTEST:${won ? 'WIN' : 'PARTIAL'}:L${game.levelIndex}:${game.stars.awakeCount}/${game.stars.total}`;
    document.documentElement.dataset.echo = document.title;
    document.documentElement.dataset.room = game.ui.roomLabel.textContent;
  }
}

boot().catch((err) => {
  console.error(err);
  document.title = 'ECHOTEST:ERROR:' + String(err);
  document.documentElement.dataset.echo = document.title;
});

ui.btnStart.addEventListener('click', () => {
  game.start();
});

ui.btnAgain.addEventListener('click', () => {
  game.restart();
});

const safariTip = document.getElementById('safari-tip');
const safariDismiss = document.getElementById('safari-tip-dismiss');
if (safariTip) {
  // Subtle and short — most players (incl. Safari) do not need it
  const hideTip = () => safariTip.classList.add('hidden');
  safariDismiss?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideTip();
  });
  setTimeout(hideTip, 4500);
}
