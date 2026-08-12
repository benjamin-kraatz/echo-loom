import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { LEVELS } from './levels.js';
import { Cathedral } from './Cathedral.js';
import { Reflectors } from './Reflectors.js';
import { Stars } from './Stars.js';
import { Weaver } from './Weaver.js';
import { Pulse, AimPreview } from './Pulse.js';
import { AudioSynth } from './Audio.js';

const ROOM_LABELS = ['Chamber I', 'Chamber II', 'Chamber III'];

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.audio = new AudioSynth();
    this.clock = new THREE.Clock();
    this.running = false;
    this.levelIndex = 0;
    this.pulses = [];
    this.pointerDown = false;
    this.holdStarted = 0;
    this.dragStart = new THREE.Vector2();
    this.dragNow = new THREE.Vector2();
    this.aimWorld = new THREE.Vector3();
    this.curveOffset = new THREE.Vector3();
    this.hintTimer = 0;
    this.transitioning = false;
    this._tmpV = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this.aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.55;
    this.renderer.setClearColor(0x1c1440, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1c1440');
    this.scene.fog = new THREE.FogExp2('#241850', 0.008);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);
    this.camera.position.set(0, 2.4, 9);
    this.camTarget = new THREE.Vector3(0, 1.5, -2);
    this.camBias = new THREE.Vector3(0, 2.2, 8.5);
    this.camDrift = 0;

    this.cathedral = new Cathedral(this.scene);
    this.stars = new Stars(this.scene);
    this.weaver = new Weaver(this.scene);
    this.reflectors = null;
    this.aimPreview = new AimPreview(this.scene);
    this.dust = null;
    this.envMap = null;

    this._onResize = () => this.resize();
    this._onOrient = () => {
      // iOS often reports stale sizes mid-rotation
      setTimeout(() => this.resize(), 80);
      setTimeout(() => this.resize(), 320);
    };
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onOrient);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this._onResize);
      window.visualViewport.addEventListener('scroll', this._onResize);
    }
    this.resize();
    this._bindInput();
  }

  async init() {
    this.reflectors = new Reflectors(this.scene, null);
    // Ambient title backdrop: chamber geometry + gentle camera
    this.loadLevel(0);
    this.ui.showHint(false);
    this.running = false;
    this.clock.start();
    this._loop();

    // Load HDRI in background; apply when ready (does not block first paint)
    new RGBELoader().load(
      '/hdri/dikhololo_night_1k.hdr',
      (rgbe) => {
        rgbe.mapping = THREE.EquirectangularReflectionMapping;
        this.envMap = rgbe;
        // Reflections only — never use HDRI as background (can black-out mobile Safari)
        this.scene.environment = rgbe;
        this.reflectors.envMap = rgbe;
        this.reflectors.group.traverse((obj) => {
          if (obj.isMesh && obj.material && 'envMap' in obj.material) {
            obj.material.envMap = rgbe;
            obj.material.envMapIntensity = 0.9;
            obj.material.needsUpdate = true;
          }
        });
      },
      undefined,
      (err) => console.warn('HDRI load failed, continuing without env map', err)
    );
  }

  _bindInput() {
    const isUiControl = (target) => {
      if (!target || !(target instanceof Element)) return false;
      return !!target.closest('button, a, input, textarea, select, [data-ui]');
    };

    const down = (x, y) => {
      if (!this.running || this.transitioning) return;
      this.pointerDown = true;
      this.holdStarted = performance.now();
      this.dragStart.set(x, y);
      this.dragNow.set(x, y);
      this._updateAimFromPointer(x, y);
    };
    const move = (x, y) => {
      if (!this.pointerDown || !this.running) return;
      this.dragNow.set(x, y);
      this._updateAimFromPointer(x, y);
    };
    const up = () => {
      if (!this.pointerDown || !this.running) {
        this.pointerDown = false;
        this.aimPreview.hide();
        return;
      }
      this.pointerDown = false;
      this.aimPreview.hide();
      this._castPulse();
    };

    // Bind to window while playing so HUD / in-app browser overlays don't steal hits.
    // Skip real UI controls (Begin / Weave Again / tip dismiss).
    this._onPointerDown = (e) => {
      if (!this.running || this.transitioning) return;
      if (isUiControl(e.target)) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') e.preventDefault();
      down(e.clientX, e.clientY);
    };
    this._onPointerMove = (e) => {
      if (!this.pointerDown || !this.running) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') e.preventDefault();
      move(e.clientX, e.clientY);
    };
    this._onPointerUp = (e) => {
      if (!this.pointerDown) return;
      if (e && (e.pointerType === 'touch' || e.pointerType === 'pen')) e.preventDefault();
      up();
    };

    window.addEventListener('pointerdown', this._onPointerDown, { passive: false });
    window.addEventListener('pointermove', this._onPointerMove, { passive: false });
    window.addEventListener('pointerup', this._onPointerUp, { passive: false });
    window.addEventListener('pointercancel', this._onPointerUp, { passive: false });

    // Extra belt-and-suspenders for stubborn WebViews
    const blockTouch = (e) => {
      if (!this.running) return;
      if (isUiControl(e.target)) return;
      e.preventDefault();
    };
    window.addEventListener('touchstart', blockTouch, { passive: false });
    window.addEventListener('touchmove', blockTouch, { passive: false });
  }

  _viewportSize() {
    const parent = this.canvas.parentElement;
    let w = (parent && parent.clientWidth) || this.canvas.clientWidth || 0;
    let h = (parent && parent.clientHeight) || this.canvas.clientHeight || 0;
    if (w < 2 || h < 2) {
      const vv = window.visualViewport;
      w = (vv && vv.width) || window.innerWidth || 2;
      h = (vv && vv.height) || window.innerHeight || 2;
    }
    return { w: Math.max(2, Math.floor(w)), h: Math.max(2, Math.floor(h)) };
  }

  _updateAimFromPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this._ndc.x = ((clientX - rect.left) / w) * 2 - 1;
    this._ndc.y = -((clientY - rect.top) / h) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this.camera);

    const weaverPos = this.weaver.position;
    // Aim against a vertical plane ahead of the weaver (predictable on phones)
    const planeZ = weaverPos.z - 4.5;
    this.aimPlane.set(new THREE.Vector3(0, 0, 1), -planeZ);

    const hit = new THREE.Vector3();
    if (!this._raycaster.ray.intersectPlane(this.aimPlane, hit)) {
      hit.copy(this._raycaster.ray.origin).addScaledVector(this._raycaster.ray.direction, 12);
    }
    // Keep aim at pleasant height range
    hit.y = THREE.MathUtils.clamp(hit.y, 0.4, 5.8);
    this.aimWorld.copy(hit);

    // Curve offset from drag delta
    const dx = this.dragNow.x - this.dragStart.x;
    const dy = this.dragNow.y - this.dragStart.y;
    const held = performance.now() - this.holdStarted;
    if (held > 90 && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      // Map screen drag into world bend (camera right / up)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      this.curveOffset
        .copy(right)
        .multiplyScalar(dx * 0.012)
        .addScaledVector(up, -dy * 0.012);
      // Clamp bend
      if (this.curveOffset.length() > 3.5) this.curveOffset.setLength(3.5);
    } else {
      // Short tap → slight forward bias, minimal curve
      this.curveOffset.set(0, 0.25, 0);
    }

    this.aimPreview.show(this.weaver.basePos.clone().add(new THREE.Vector3(0, 0.05, 0)), this.aimWorld, this.curveOffset);
  }

  _castPulse() {
    // Short tap without much drag: aim forward from weaver into the room
    const held = performance.now() - this.holdStarted;
    const dragDist = this.dragNow.distanceTo(this.dragStart);
    let aim = this.aimWorld.clone();
    let curve = this.curveOffset.clone();
    if (held < 140 && dragDist < 14) {
      aim.copy(this.weaver.basePos).add(new THREE.Vector3(0, 0.3, -5));
      curve.set(0, 0.2, 0);
    }
    const pulse = new Pulse({
      scene: this.scene,
      origin: this.weaver.basePos.clone().add(new THREE.Vector3(0, 0.05, 0)),
      aimPoint: aim,
      curveOffset: curve,
      reflectors: this.reflectors,
      stars: this.stars,
      audio: this.audio,
      onStar: () => this._onStarAwake(),
    });
    this.pulses.push(pulse);
    this.audio.pulseCast();
  }

  _onStarAwake() {
    this.ui.setStars(this.stars.awakeCount, this.stars.total);
    if (this.stars.allAwake() && !this.transitioning) {
      this._levelComplete();
    }
  }

  async start() {
    await this.audio.unlock();
    this.levelIndex = 0;
    this.ui.hideTitle();
    this.ui.hideWin();
    this.ui.showHud();
    this.loadLevel(0);
    this.running = true;
    this.resize();
    requestAnimationFrame(() => this.resize());
  }

  loadLevel(index) {
    this._clearPulses();
    this.levelIndex = index;
    const level = LEVELS[index];
    this.weaver.setPosition(level.weaver);
    this.camBias.fromArray(level.cameraBias);
    this.reflectors.load(level);
    this.stars.load(level);
    this._buildDust(level.dust || 80);
    this.ui.setRoom(ROOM_LABELS[index] || level.name);
    this.ui.setStars(0, this.stars.total);
    this.hintTimer = 10;
    this.ui.showHint(true);
    this.transitioning = false;
    this.camDrift = 0;
  }

  _buildDust(count) {
    if (this.dust) {
      this.scene.remove(this.dust);
      this.dust.geometry.dispose();
      this.dust.material.dispose();
    }
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 7 + 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: '#d0c0ff',
      size: 0.07,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(geo, mat);
    this.scene.add(this.dust);
  }

  _clearPulses() {
    for (const p of this.pulses) p.kill();
    this.pulses.length = 0;
    this.aimPreview.hide();
  }

  async _levelComplete() {
    this.transitioning = true;
    this.audio.levelClear();
    const level = LEVELS[this.levelIndex];
    this.ui.showBanner('Constellation Tuned', level.subtitle || 'Chamber Cleared');
    await this._wait(1600);
    this.ui.hideBanner();
    await this._wait(350);
    if (this.levelIndex >= LEVELS.length - 1) {
      this.audio.winFanfare();
      this.running = false;
      this.ui.hideHud();
      this.ui.showWin();
      this.transitioning = false;
      return;
    }
    this.loadLevel(this.levelIndex + 1);
  }

  _wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  resize() {
    // Measure from the fixed #app box first (more stable than canvas during attr changes)
    const parent = this.canvas.parentElement;
    let w = parent ? parent.clientWidth : 0;
    let h = parent ? parent.clientHeight : 0;
    if (w < 2 || h < 2) {
      const vv = window.visualViewport;
      w = Math.floor((vv && vv.width) || window.innerWidth || 2);
      h = Math.floor((vv && vv.height) || window.innerHeight || 2);
    }
    w = Math.max(2, Math.floor(w));
    h = Math.max(2, Math.floor(h));

    // Lock CSS to exact layout pixels BEFORE touching buffer attrs.
    // Leaving canvas at intrinsic width(=drawingBuffer) overflows #app on WebKit and
    // clips to the left portion — looking like a black void with content on the right edge.
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0px';
    this.canvas.style.top = '0px';
    this.canvas.style.right = 'auto';
    this.canvas.style.bottom = 'auto';
    this.canvas.style.margin = '0';
    this.canvas.style.padding = '0';
    this.canvas.style.border = '0';
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.maxHeight = '100%';

    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, true);
    // Re-assert CSS after setSize(true) so nothing reverts to intrinsic overflow
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(false);

    this.camera.aspect = w / h;
    const aspect = w / h;
    if (aspect < 0.7) this.camera.fov = 68;
    else if (aspect < 1) this.camera.fov = 58;
    else this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
    this._lastSizeW = w;
    this._lastSizeH = h;
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    // iOS Safari can change layout after URL bar show/hide without a reliable event
    const { w, h } = this._viewportSize();
    if (w !== this._lastSizeW || h !== this._lastSizeH) this.resize();
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    this.weaver.update(dt);
    this.stars.update(dt, t);

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      this.pulses[i].update(dt);
      if (!this.pulses[i].alive) this.pulses.splice(i, 1);
    }

    if (this.dust) {
      this.dust.rotation.y = t * 0.02;
      const arr = this.dust.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += Math.sin(t + i) * 0.0015;
        if (arr[i + 1] > 7.5) arr[i + 1] = 0.3;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }

    // Gentle camera drift following weaver
    this.camDrift += dt;
    const weaver = this.weaver.position;
    const desired = new THREE.Vector3(
      weaver.x * 0.35 + Math.sin(this.camDrift * 0.25) * 0.35,
      this.camBias.y + Math.sin(this.camDrift * 0.4) * 0.15,
      weaver.z + this.camBias.z
    );
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 1.8));
    this.camTarget.set(weaver.x, weaver.y + 0.4, weaver.z - 3.5);
    this.camera.lookAt(this.camTarget);

    if (this.hintTimer > 0 && this.running) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.ui.showHint(false);
    }

    // Keep aim preview live while holding
    if (this.pointerDown && this.running && !this.transitioning) {
      this.aimPreview.show(
        this.weaver.basePos.clone().add(new THREE.Vector3(0, 0.05, 0)),
        this.aimWorld,
        this.curveOffset
      );
    }

    this.renderer.render(this.scene, this.camera);
  }

  restart() {
    this.ui.hideWin();
    this.start();
  }
}
