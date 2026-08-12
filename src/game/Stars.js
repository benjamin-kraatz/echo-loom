import * as THREE from 'three';

export class Stars {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Stars';
    scene.add(this.group);
    /** @type {{mesh: THREE.Mesh, glow: THREE.Mesh, awake: boolean, color: THREE.Color, radius: number, pulse: number}[]} */
    this.nodes = [];
    this.awakeCount = 0;
  }

  clear() {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    this.nodes = [];
    this.awakeCount = 0;
  }

  load(level) {
    this.clear();
    for (const s of level.stars) {
      const color = new THREE.Color(s.color);
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 16, 16),
        new THREE.MeshStandardMaterial({
          color: color.clone().multiplyScalar(0.7),
          emissive: color.clone().multiplyScalar(0.8),
          emissiveIntensity: 2.0,
          roughness: 0.3,
          metalness: 0.15,
          toneMapped: false,
        })
      );
      core.position.fromArray(s.pos);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 16, 16),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        })
      );
      core.add(glow);

      // Outer spark sprite-like octa
      const spark = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.12, 0),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      spark.rotation.z = Math.PI / 4;
      core.add(spark);

      this.group.add(core);
      this.nodes.push({
        mesh: core,
        glow,
        spark,
        awake: false,
        color,
        radius: 0.7,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  get total() {
    return this.nodes.length;
  }

  /**
   * @returns {number|null} index awakened, or null
   */
  tryHit(point, hitRadius = 1.05) {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.awake) continue;
      if (point.distanceTo(n.mesh.position) <= hitRadius) {
        this._awaken(n);
        return i;
      }
    }
    return null;
  }

  _awaken(n) {
    n.awake = true;
    this.awakeCount++;
    n.mesh.material.emissive.copy(n.color);
    n.mesh.material.emissiveIntensity = 2.2;
    n.mesh.material.color.copy(n.color);
    n.glow.material.opacity = 0.55;
    n.spark.material.opacity = 1;
  }

  update(dt, t) {
    for (const n of this.nodes) {
      n.pulse += dt;
      const breathe = 1 + Math.sin(t * 2.2 + n.pulse) * (n.awake ? 0.12 : 0.06);
      n.glow.scale.setScalar(breathe);
      n.spark.rotation.y += dt * (n.awake ? 1.8 : 0.6);
      if (!n.awake) {
        n.glow.material.opacity = 0.28 + Math.sin(t * 3 + n.pulse) * 0.1;
      }
    }
  }

  allAwake() {
    return this.awakeCount >= this.nodes.length && this.nodes.length > 0;
  }
}
