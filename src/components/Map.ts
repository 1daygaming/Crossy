import * as THREE from "three";
// import type { Row } from "../types"; // Старый тип Row больше не нужен в таком виде
// import { generateRows } from "../utilities/generateRows"; // Удалено
import { Grass } from "./Grass";
import { Road } from "./Road";
import { Car } from "./Car"; // Импортируем Car
import { Truck } from "./Truck"; // Импортируем Truck
// import { Tree } from "./Tree"; // Пока не используем
// import { Car } from "./Car"; // Пока не используем
// import { Truck } from "./Truck"; // Пока не используем
import { tileSize } from "../constants";
import type { RowStateClient, ClientVehicleInfo } from "../main"; // Импортируем типы из main

// Убираем неиспользуемый интерфейс ServerRowState, если он больше нигде не нужен
// interface ServerRowState { ... }

export const map = new THREE.Group(); // Наша основная группа для карты, к ней будет привязан player в main.ts

// Хранилище для деталей каждого отрендеренного ряда
interface RenderedRowDetail {
  group: THREE.Group;             // 3D группа ряда (содержит основу и все машины)
  clientVehicles: ClientVehicleInfo[]; // Массив информации о машинах с ссылками ref
}
const renderedRowDetails: { [rowId: number]: RenderedRowDetail } = {};

export function initializeClientMap() {
  map.remove(...map.children);
  for (const rowId in renderedRowDetails) {
    delete renderedRowDetails[Number(rowId)];
  }
}

export function syncMapWithServer(currentMapRows: RowStateClient[]) {
  const newRenderedRowIds = new Set<number>();

  currentMapRows.forEach((rowData) => {
    newRenderedRowIds.add(rowData.id);
    let currentVehiclesForAnimation: ClientVehicleInfo[] = [];

    if (!renderedRowDetails[rowData.id]) {
      // Ряд НОВЫЙ
      const rowGroup = new THREE.Group();
      rowGroup.position.y = rowData.id * tileSize;
      map.add(rowGroup);

      let baseRowObject: THREE.Group | null = null;
      if (rowData.type === "grass") {
        baseRowObject = Grass(0);
      } else if (rowData.type === "car" || rowData.type === "truck" || rowData.type === "road") {
        baseRowObject = Road(0);
      }
      if (baseRowObject) {
        rowGroup.add(baseRowObject);
      }

      const createdClientVehicles: ClientVehicleInfo[] = [];
      if ((rowData.type === "car" || rowData.type === "truck") && rowData.serverVehiclesData) {
        rowData.serverVehiclesData.forEach((vehicleData: any) => {
          const initialTileIndex = vehicleData.initialTileIndex;
          const direction = !!rowData.direction;
          const h = ((rowData.id + initialTileIndex) * 0.317) % 1;
          const s = 0.6 + Math.random() * 0.1;
          const l = 0.5 + Math.random() * 0.1;
          const determinedColor = new THREE.Color().setHSL(h, s, l);
          let vehicleObject: THREE.Object3D | null = null;
          if (rowData.type === "car") {
            vehicleObject = Car(initialTileIndex, direction, determinedColor);
          } else if (rowData.type === "truck") {
            vehicleObject = Truck(initialTileIndex, direction, determinedColor);
          }
          if (vehicleObject) {
            rowGroup.add(vehicleObject);
            const clientVehicle: ClientVehicleInfo = {
              initialTileIndex: initialTileIndex,
              ref: vehicleObject
            };
            createdClientVehicles.push(clientVehicle);
          }
        });
      }
      renderedRowDetails[rowData.id] = { group: rowGroup, clientVehicles: createdClientVehicles };
      currentVehiclesForAnimation = createdClientVehicles;
    } else {
      // Ряд СУЩЕСТВУЕТ. Берем clientVehicles из нашего хранилища.
      currentVehiclesForAnimation = renderedRowDetails[rowData.id].clientVehicles;
    }
    // Присваиваем актуальный (созданный или восстановленный) массив машин 
    // полю rowData.renderedVehicles, которое ожидает animateVehicles.
    rowData.renderedVehicles = currentVehiclesForAnimation;
  });

  // Удаляем старые ряды
  for (const rowIdStr in renderedRowDetails) {
    const rowId = Number(rowIdStr);
    if (!newRenderedRowIds.has(rowId)) {
      const detailToRemove = renderedRowDetails[rowId];
      if (detailToRemove) {
        map.remove(detailToRemove.group); 
      }
      delete renderedRowDetails[rowId];
    }
  }
}

// ЗАМЕЧАНИЕ: Функции Grass(rowIndex) и Road(rowIndex) нужно будет адаптировать.
// Раньше они принимали rowIndex и использовали его для установки своей глобальной Y-позиции.
// Теперь Y-позиция устанавливается для их родительской группы (rowGroup).
// Поэтому Grass и Road должны либо принимать rowIndex=0 и не смещать по Y,
// либо их нужно переписать так, чтобы они просто возвращали геометрию ряда на локальном Y=0.

// Пример адаптации для Grass (аналогично для Road):
// export function Grass(ignoredRowIndex: number) { // rowIndex больше не используется для Y
//   const grass = new THREE.Group();
//   // grass.position.y = rowIndex * tileSize; // ЭТУ СТРОКУ НУЖНО УДАЛИТЬ ИЛИ ЗАКОММЕНТИРОВАТЬ
//
//   const foundation = new THREE.Mesh(
//     new THREE.BoxGeometry(tilesPerRow * tileSize, tileSize, 3),
//     new THREE.MeshLambertMaterial({ color: 0xbaf455 })
//   );
//   foundation.position.z = 1.5;
//   foundation.receiveShadow = true;
//   grass.add(foundation);
//   return grass;
// }