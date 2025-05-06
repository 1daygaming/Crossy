import * as THREE from "three";

export function Wheel(x: number) {
  
  const wheel = new THREE.Group();

    const wheel_black = new THREE.Mesh(
    new THREE.BoxGeometry(12, 33, 12),
    new THREE.MeshLambertMaterial({
      color: 0x333333,
      flatShading: true,
    })
  );

  const cylinder = new THREE.Mesh(
    new THREE.BoxGeometry(3, 34, 3),
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
    })
  );

  wheel.add(wheel_black);
  wheel.add(cylinder);


  wheel.position.x = x;
  wheel.position.z = 6;
  return wheel;
}