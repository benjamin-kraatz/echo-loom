import * as THREE from 'three';

export class Weaver {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Weaver';
    scene.add(this.group);

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 20),
      new THREE.MeshStandardMaterial({
        color: '#fff6e8',
        emissive: '#ffd9a0',
        emissiveIntensity: 6.5,
        roughness: 0.2,
        metalness: 0.1,
        toneMapped: false,
      })
    );
    this.group.add(this.core);

    this.halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 20, 20),
      new THREE.MeshBasicMaterial({
        color: '#ffe0b0',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    );
    this.group.add(this.halo);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.035, 8, 48),
      new THREE.MeshBasicMaterial({
        color: '#c8a0ff',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.ring.rotation.x = Math.PI / 2.4;
    this.group.add(this.ring);

    this.basePos = new THREE.Vector3(0, 1.2, 0);
    this.group.position.copy(this.basePos);
    this._t = 0;
  }

  setPosition(arr) {
    this.basePos.fromArray(arr);
    this.group.position.copy(this.basePos);
  }

  get position() {
    return this.group.position;
  }

  update(dt) {
    this._t += dt;
    const bob = Math.sin(this._t * 1.6) * 0.12;
    const sway = Math.cos(this._t * 1.1) * 0.08;
    this.group.position.x = this.basePos.x + sway;
    this.group.position.y = this.basePos.y + bob;
    this.group.position.z = this.basePos.z;
    this.halo.scale.setScalar(1 + Math.sin(this._t * 3) * 0.08);
    this.ring.rotation.z += dt * 0.7;
    this.ring.rotation.x = Math.PI / 2.4 + Math.sin(this._t * 0.8) * 0.15;
  }
}
