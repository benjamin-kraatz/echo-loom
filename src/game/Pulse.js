import * as THREE from 'three';

const MAX_BOUNCES = 7;
const MAX_LIFE = 4.2;
const SPEED = 12;

/**
 * Light pulse that follows an optional curved intro path, then reflects off glass/crystals.
 */
export class Pulse {
  /**
   * @param {object} opts
   * @param {THREE.Vector3} opts.origin
   * @param {THREE.Vector3} opts.aimPoint world point aimed at
   * @param {THREE.Vector3|null} opts.curveOffset drag bend in world space (optional)
   * @param {import('./Reflectors.js').Reflectors} opts.reflectors
   * @param {import('./Stars.js').Stars} opts.stars
   * @param {import('./Audio.js').AudioSynth} opts.audio
   * @param {(index:number)=>void} opts.onStar
   */
  constructor(opts) {
    this.reflectors = opts.reflectors;
    this.stars = opts.stars;
    this.audio = opts.audio;
    this.onStar = opts.onStar;
    this.alive = true;
    this.age = 0;
    this.bounces = 0;
    this.position = opts.origin.clone();
    this.prev = this.position.clone();

    // Build path: quadratic bezier intro then free flight
    const aim = opts.aimPoint.clone();
    const dir = aim.clone().sub(opts.origin);
    if (dir.lengthSq() < 0.01) dir.set(0, 0.1, -1);
    dir.normalize();

    const curveLen = 5.5;
    const end = opts.origin.clone().addScaledVector(dir, curveLen);
    let control;
    if (opts.curveOffset && opts.curveOffset.lengthSq() > 0.01) {
      control = opts.origin
        .clone()
        .add(end)
        .multiplyScalar(0.5)
        .add(opts.curveOffset);
    } else {
      control = opts.origin.clone().add(end).multiplyScalar(0.5);
      control.y += 0.35;
    }

    this.curve = new THREE.QuadraticBezierCurve3(opts.origin.clone(), control, end);
    this.curveT = 0;
    this.onCurve = true;
    // Velocity after curve from tangent
    this.velocity = this.curve.getTangent(1).normalize().multiplyScalar(SPEED);

    // Visual trail
    this.group = new THREE.Group();
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      new THREE.MeshBasicMaterial({
        color: '#fff4d6',
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshBasicMaterial({
        color: '#ffc878',
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.group.add(this.head, this.glow);

    const maxPts = 64;
    this.trailPositions = new Float32Array(maxPts * 3);
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3)
    );
    this.trailGeo.setDrawRange(0, 0);
    this.trailMat = new THREE.LineBasicMaterial({
      color: '#ffe0a0',
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.trail = new THREE.Line(this.trailGeo, this.trailMat);
    this.group.add(this.trail);
    this.trailPts = [];
    this._pushTrail(this.position);

    opts.scene.add(this.group);
    this.scene = opts.scene;
  }

  _pushTrail(p) {
    this.trailPts.push(p.clone());
    if (this.trailPts.length > 48) this.trailPts.shift();
    for (let i = 0; i < this.trailPts.length; i++) {
      const q = this.trailPts[i];
      this.trailPositions[i * 3] = q.x;
      this.trailPositions[i * 3 + 1] = q.y;
      this.trailPositions[i * 3 + 2] = q.z;
    }
    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.setDrawRange(0, this.trailPts.length);
  }

  update(dt) {
    if (!this.alive) return;
    this.age += dt;
    if (this.age > MAX_LIFE) {
      this.kill();
      return;
    }

    this.prev.copy(this.position);
    let travel = SPEED * dt;

    if (this.onCurve) {
      const curveSpeed = SPEED / 5.5; // units of t per second ~ roughly match
      this.curveT += curveSpeed * dt;
      if (this.curveT >= 1) {
        this.onCurve = false;
        this.position.copy(this.curve.getPoint(1));
        this.velocity = this.curve.getTangent(1).normalize().multiplyScalar(SPEED);
        travel = SPEED * Math.max(0, this.curveT - 1) * 5.5 * 0.15;
      } else {
        this.position.copy(this.curve.getPoint(this.curveT));
        this._afterMove();
        return;
      }
    }

    // Reflecting free flight with substeps
    let guard = 0;
    while (travel > 0 && this.alive && guard++ < 8) {
      const dir = this.velocity.clone().normalize();
      const hit = this.reflectors.raycast(this.position, dir, travel + 0.05);
      if (hit && hit.distance <= travel) {
        this.position.copy(hit.point).addScaledVector(hit.normal, 0.04);
        // reflect
        this.velocity.reflect(hit.normal).normalize().multiplyScalar(SPEED);
        this.bounces++;
        this.audio.glassTing(1 - this.bounces * 0.1);
        travel -= hit.distance;
        this._checkStars();
        if (this.bounces > MAX_BOUNCES) {
          this.kill();
          return;
        }
      } else {
        this.position.addScaledVector(dir, travel);
        travel = 0;
      }
    }

    this._afterMove();
  }

  _afterMove() {
    this.group.position.copy(this.position);
    this._pushTrail(this.position);
    this._checkStars();
    // Fade near end of life
    const lifeFade = 1 - Math.max(0, this.age - (MAX_LIFE - 0.6)) / 0.6;
    this.head.material.opacity = lifeFade;
    this.glow.material.opacity = 0.45 * lifeFade;
    this.trailMat.opacity = 0.75 * lifeFade;
  }

  _checkStars() {
    // Check segment from prev to current for star hits
    const mid = this.prev.clone().lerp(this.position, 0.5);
    const idx =
      this.stars.tryHit(this.position) ??
      this.stars.tryHit(mid) ??
      this.stars.tryHit(this.prev);
    if (idx !== null && idx !== undefined) {
      this.audio.starAwaken(idx);
      this.onStar(idx);
    }
  }

  kill() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.group);
    this.head.geometry.dispose();
    this.glow.geometry.dispose();
    this.trailGeo.dispose();
    this.head.material.dispose();
    this.glow.material.dispose();
    this.trailMat.dispose();
  }
}

/**
 * Aim preview curve while holding.
 */
export class AimPreview {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    const positions = new Float32Array(48 * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.mat = new THREE.LineBasicMaterial({
      color: '#c8b0ff',
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.line = new THREE.Line(this.geo, this.mat);
    this.group.add(this.line);
    this.dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 10),
      new THREE.MeshBasicMaterial({
        color: '#e8d0ff',
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.group.add(this.dot);
    this.visible = false;
    this.group.visible = false;
  }

  show(origin, aimPoint, curveOffset) {
    const dir = aimPoint.clone().sub(origin);
    if (dir.lengthSq() < 0.01) dir.set(0, 0.1, -1);
    dir.normalize();
    const end = origin.clone().addScaledVector(dir, 5.5);
    const control = origin
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .add(curveOffset || new THREE.Vector3(0, 0.35, 0));
    const curve = new THREE.QuadraticBezierCurve3(origin, control, end);
    const pts = curve.getPoints(24);
    // Extend a bit in tangent for preview
    const tan = curve.getTangent(1).normalize();
    for (let i = 0; i < 16; i++) {
      pts.push(end.clone().addScaledVector(tan, (i + 1) * 0.35));
    }
    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < pts.length; i++) {
      pos[i * 3] = pts[i].x;
      pos[i * 3 + 1] = pts[i].y;
      pos[i * 3 + 2] = pts[i].z;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.setDrawRange(0, pts.length);
    this.dot.position.copy(pts[pts.length - 1]);
    this.group.visible = true;
    this.visible = true;
  }

  hide() {
    this.group.visible = false;
    this.visible = false;
  }
}
