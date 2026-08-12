import * as THREE from 'three';

/**
 * Glass panes and crystals with reflection planes for pulse physics.
 */
export class Reflectors {
  constructor(scene, envMap) {
    this.scene = scene;
    this.envMap = envMap;
    this.group = new THREE.Group();
    this.group.name = 'Reflectors';
    scene.add(this.group);
    /** @type {{point: THREE.Vector3, normal: THREE.Vector3, mesh: THREE.Object3D}[]} */
    this.planes = [];
    /** @type {{center: THREE.Vector3, radius: number, mesh: THREE.Object3D}[]} */
    this.spheres = [];
  }

  clear() {
    while (this.group.children.length) {
      const child = this.group.children.pop();
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    this.planes = [];
    this.spheres = [];
  }

  load(level) {
    this.clear();
    for (const g of level.glass) {
      this._addGlass(g);
    }
    for (const c of level.crystals) {
      this._addCrystal(c);
    }
  }

  _glassMaterial() {
    // MeshPhysical transmission frequently renders pure black on iOS Safari.
    // Use standard transparent glass with emissive so panes stay readable on OLED.
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b8d0ff'),
      metalness: 0.35,
      roughness: 0.15,
      transparent: true,
      opacity: 0.5,
      envMap: this.envMap || null,
      envMapIntensity: 1.0,
      emissive: new THREE.Color('#7a9cff'),
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
  }

  _addGlass(def) {
    const [w, h, d] = def.size;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = this._glassMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.fromArray(def.pos);
    mesh.rotation.fromArray(def.rot);
    mesh.updateMatrixWorld(true);
    this.group.add(mesh);

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: 0xe0d0ff,
        transparent: true,
        opacity: 1.0, toneMapped: false,
      })
    );
    mesh.add(line);

    // Reflection plane through center, facing forward local +Z then transformed
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion).normalize();
    const point = mesh.position.clone();
    this.planes.push({ point, normal, mesh, halfW: w * 0.5, halfH: h * 0.5 });
  }

  _addCrystal(def) {
    const geo = new THREE.OctahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e0f0ff'),
      metalness: 0.4,
      roughness: 0.12,
      transparent: true,
      opacity: 0.75,
      envMap: this.envMap,
      envMapIntensity: 1.1,
      emissive: new THREE.Color('#80b0ff'),
      emissiveIntensity: 1.0,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.fromArray(def.pos);
    mesh.rotation.fromArray(def.rot);
    mesh.scale.setScalar(def.scale);
    mesh.updateMatrixWorld(true);
    this.group.add(mesh);

    const edges = new THREE.EdgesGeometry(geo);
    mesh.add(
      new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: 0xc8ecff,
          transparent: true,
          opacity: 1.0, toneMapped: false,
        })
      )
    );

    // Sphere proxy reflection — cheaper and more predictable than all faces
    this.spheres = this.spheres || [];
    this.spheres.push({
      center: mesh.position.clone(),
      radius: def.scale * 0.95,
      mesh,
    });
  }

  /**
   * Ray vs reflector planes. Returns nearest hit in front of ray.
   */
  raycast(origin, direction, maxDist = 40) {
    let best = null;
    let bestT = maxDist;
    const o = origin;
    const d = direction;

    for (const plane of this.planes) {
      const denom = d.dot(plane.normal);
      if (Math.abs(denom) < 1e-5) continue;
      const t = plane.point.clone().sub(o).dot(plane.normal) / denom;
      if (t < 0.05 || t >= bestT) continue;

      const hit = o.clone().addScaledVector(d, t);

      if (!plane.unbounded) {
        // Project into plane local axes using mesh quaternion
        const local = hit.clone().sub(plane.point);
        const q = plane.mesh.quaternion;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const u = local.dot(right);
        const v = local.dot(up);
        if (Math.abs(u) > plane.halfW || Math.abs(v) > plane.halfH) continue;
      } else {
        // Crystal face: keep hit near face center
        if (hit.distanceTo(plane.point) > plane.halfW * 1.4) continue;
      }

      // Ensure bounce goes away from the surface we hit
      let n = plane.normal.clone();
      if (d.dot(n) > 0) n.negate();

      bestT = t;
      best = { point: hit, normal: n, distance: t, mesh: plane.mesh };
    }
    // Sphere crystals
    for (const sph of this.spheres || []) {
      const oc = o.clone().sub(sph.center);
      const b = oc.dot(d);
      const c = oc.lengthSq() - sph.radius * sph.radius;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t < 0.05 || t >= bestT) continue;
      const hit = o.clone().addScaledVector(d, t);
      const n = hit.clone().sub(sph.center).normalize();
      bestT = t;
      best = { point: hit, normal: n, distance: t, mesh: sph.mesh };
    }
    return best;
  }
}
