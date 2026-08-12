import * as THREE from 'three';

/**
 * Procedural cathedral void: arches, pillars, floor inlay, fog atmosphere.
 */
export class Cathedral {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Cathedral';
    scene.add(this.group);
    this._build();
  }

  _build() {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2a1f48'),
      roughness: 0.9,
      metalness: 0.08,
      emissive: new THREE.Color('#1a1040'),
      emissiveIntensity: 0.35,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3a2860'),
      roughness: 0.65,
      metalness: 0.28,
      emissive: new THREE.Color('#5a38a0'),
      emissiveIntensity: 0.32,
    });

    // Floor disc with subtle ring
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshStandardMaterial({
        color: '#281a4a',
        roughness: 0.92,
        metalness: 0.08,
        emissive: new THREE.Color('#2a1858'),
        emissiveIntensity: 0.45,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    this.group.add(floor);

    const inlay = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 3.7, 64),
      new THREE.MeshBasicMaterial({
        color: '#a078e8',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    inlay.rotation.x = -Math.PI / 2;
    inlay.position.y = 0.02;
    this.group.add(inlay);

    // Pillars around the chamber
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.35, 7.5, 10);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 10.5;
      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.set(Math.cos(a) * r, 3.75, Math.sin(a) * r - 2);
      this.group.add(pillar);

      const capital = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.25, 0.9),
        accentMat
      );
      capital.position.set(pillar.position.x, 7.5, pillar.position.z);
      this.group.add(capital);
    }

    // Gothic arch frames (simplified extruded curves as tubes)
    for (let i = 0; i < 5; i++) {
      const z = -1.5 - i * 2.2;
      const arch = this._makeArch(6.5 + i * 0.15, 5.8, accentMat);
      arch.position.z = z;
      this.group.add(arch);
    }

    // Rear stained-glass suggestion (emissive panes, non-reflective decoration)
    const rearColors = ['#5b2c6f', '#1a5276', '#784212', '#145a32', '#4a235a'];
    for (let i = 0; i < 5; i++) {
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.8),
        new THREE.MeshBasicMaterial({
          color: rearColors[i],
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          toneMapped: false,
        })
      );
      pane.position.set(-4 + i * 2, 3.5, -10.5);
      this.group.add(pane);
    }

    // Soft ambient fill lights (cheap)
    const amb = new THREE.AmbientLight(0x6a58b0, 1.35);
    this.scene.add(amb);

    const hemi = new THREE.HemisphereLight(0xc8b8ff, 0x1a1030, 0.85);
    this.scene.add(hemi);

    const key = new THREE.PointLight(0xd0c0ff, 3.2, 40, 2);
    key.position.set(0, 6, 2);
    this.scene.add(key);

    const rim = new THREE.PointLight(0x80a0ff, 1.4, 28, 2);
    rim.position.set(-4, 4, -4);
    this.scene.add(rim);

    const warm = new THREE.PointLight(0xffc090, 1.1, 24, 2);
    warm.position.set(3, 3, 1);
    this.scene.add(warm);

    // Floor fill so Chamber I isn't a black void on OLED
    const floorFill = new THREE.PointLight(0xb090ff, 1.0, 18, 2);
    floorFill.position.set(0, 1.2, -1);
    this.scene.add(floorFill);
  }

  _makeArch(halfWidth, height, mat) {
    const group = new THREE.Group();
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, height, 0.18), mat);
    left.position.set(-halfWidth, height / 2, 0);
    const right = left.clone();
    right.position.x = halfWidth;
    group.add(left, right);

    // Approximated pointed arch with boxes
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, t);
      const archY = height + Math.sin(t * Math.PI) * 1.6;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), mat);
      seg.position.set(x, archY, 0);
      group.add(seg);
    }
    return group;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    this.scene.remove(this.group);
  }
}
