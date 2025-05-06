import * as THREE from "three";
import { tileSize } from "../constants";

export function Tree(tileIndex: number, height: number) {
  const tree = new THREE.Group();
  tree.position.x = tileIndex * tileSize;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10, 40, 20, 20),
    new THREE.MeshLambertMaterial({
      color: 0x4d2926,
      flatShading: true,
    })
  );
  trunk.rotation.x = Math.PI / 2;
  trunk.position.z = 10;
  tree.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(20, 30, 20, 20),
    new THREE.MeshLambertMaterial({
      color: 0x7aa21d,
      flatShading: true,
    })
  );
  crown.rotation.x = Math.PI / 2;
  crown.position.z = height / 2 + 20;

  const crown2= new THREE.Mesh(
    new THREE.ConeGeometry(20, 30, 20, 20),
    new THREE.MeshLambertMaterial({
      color: 0x7aa21d,
      flatShading: true,
    })
  );
  crown2.rotation.x = Math.PI / 2;
  crown2.position.z = height+10;

  crown.castShadow = true;
  crown.receiveShadow = true;
  crown2.castShadow = true;
  crown2.receiveShadow = true;
  tree.add(crown);
  tree.add(crown2);
  return tree;
}