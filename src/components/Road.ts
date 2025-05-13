import * as THREE from "three";
import { tilesPerRow, tileSize } from "../constants";

// rowIndex больше не используется для Y-позиционирования в этой функции,
// так как родительская группа ряда (rowGroup в Map.ts) уже позиционируется по Y.
// Функция должна вернуть объект с локальной Y-координатой 0.
export function Road(_ignoredRowIndex: number) {
  const road = new THREE.Group();
  // road.position.y = rowIndex * tileSize; // ЭТА СТРОКА УДАЛЕНА

  const foundation = new THREE.Mesh(
    new THREE.PlaneGeometry(tilesPerRow * tileSize, tileSize), // Используем PlaneGeometry для дороги
    new THREE.MeshLambertMaterial({ color: 0x454a59 })
  );
  // Для PlaneGeometry, чтобы она была горизонтальной, ее нужно повернуть.
  // Обычно PlaneGeometry создается в плоскости XY. Если нам нужна плоскость XZ (горизонтальная),
  // ее нужно повернуть вокруг оси X.
  // foundation.rotation.x = -Math.PI / 2; 
  // Однако, если наша камера настроена так, что Y - это "вверх/вниз" на экране,
  // а ряды располагаются вдоль Y, то PlaneGeometry в плоскости XY уже будет правильно ориентирована
  // для отображения как "плитка" дороги, если ее не вращать и если Y - это глобальная ось рядов.
  // tileSize по Y в BoxGeometry для Grass был высотой, здесь это будет "глубина" дороги, если смотреть сверху.
  // Давайте пока оставим без вращения, если PlaneGeometry создается "лицом" к камере по умолчанию.
  // Учитывая, что у Grass был BoxGeometry с толщиной 3 по Z, и position.z = 1.5, 
  // для дороги, если она должна быть на том же уровне, ее Z должен быть около 0.
  // PlaneGeometry не имеет толщины. Для визуальной консистентности можно использовать BoxGeometry для дороги.
  // Либо оставить PlaneGeometry, но понимать, что она плоская.
  
  // Используем BoxGeometry для дороги, чтобы она имела небольшую толщину, как трава
  const roadSurface = new THREE.Mesh(
    new THREE.BoxGeometry(tilesPerRow * tileSize, tileSize, 3), // Та же толщина, что и у травы
    new THREE.MeshLambertMaterial({ color: 0x454a59 })
  );
  roadSurface.position.z = 1.5; // На том же уровне Z, что и трава
  roadSurface.receiveShadow = true;
  road.add(roadSurface);

  return road;
}