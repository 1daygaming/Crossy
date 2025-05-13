import * as THREE from "three";
import { tilesPerRow, tileSize } from "../constants";

// rowIndex больше не используется для Y-позиционирования в этой функции,
// так как родительская группа ряда (rowGroup в Map.ts) уже позиционируется по Y.
// Функция должна вернуть объект с локальной Y-координатой 0.
export function Grass(_ignoredRowIndex: number) { 
  const grass = new THREE.Group();
  // grass.position.y = rowIndex * tileSize; // ЭТА СТРОКА УДАЛЕНА

  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(tilesPerRow * tileSize, tileSize, 3),
    new THREE.MeshLambertMaterial({ color: 0xbaf455 })
  );
  foundation.position.z = 1.5; // Z-позиция для глубины/толщины травы
  foundation.receiveShadow = true;
  grass.add(foundation);

  return grass;
}