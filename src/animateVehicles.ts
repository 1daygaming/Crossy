import * as THREE from "three";
import { currentMapRows } from "./main";
import { minTileIndex, maxTileIndex, tileSize } from "./constants";
import type { RowStateClient, ClientVehicleInfo } from "./main";

// const clock = new THREE.Clock(); // Локальный clock больше не нужен для расчета позиций

// Границы для "телепортации" машин, как на сервере, но в мировых координатах
const VEHICLE_WRAP_LOWER_BOUND_WORLD = (minTileIndex - 2) * tileSize; 
const VEHICLE_WRAP_UPPER_BOUND_WORLD = (maxTileIndex + 2) * tileSize; 
const VEHICLE_WRAP_WIDTH_WORLD = VEHICLE_WRAP_UPPER_BOUND_WORLD - VEHICLE_WRAP_LOWER_BOUND_WORLD;

export function animateVehicles(serverElapsedTimeMs: number) {
  // const delta = clock.getDelta(); // delta больше не используется для основного расчета позиции
  const serverElapsedTimeSeconds = serverElapsedTimeMs / 1000.0;

  currentMapRows.forEach((rowData: RowStateClient) => {
    if ((rowData.type === "car" || rowData.type === "truck") && 
        rowData.speed !== undefined && 
        rowData.direction !== undefined && // Убедимся, что направление тоже есть
        rowData.renderedVehicles && 
        rowData.renderedVehicles.length > 0) {
      
      // Границы для телепортации машин уже определены глобально

      rowData.renderedVehicles.forEach((clientVehicle: ClientVehicleInfo) => {
        const ref = clientVehicle.ref;
        const initialXInTiles = clientVehicle.initialTileIndex;
        
        // Расчет текущей X-координаты в тайлах, аналогично серверу
        const distanceMovedTiles = rowData.speed! * serverElapsedTimeSeconds;
        let currentXInTiles = initialXInTiles + (rowData.direction ? distanceMovedTiles : -distanceMovedTiles);

        // Нормализация/обертывание позиции машины в тайловых координатах (относительно диапазона MIN_TILE_INDEX до MAX_TILE_INDEX)
        // Это упрощенная обертка, предполагающая, что initialTileIndex уже в правильном диапазоне.
        // Логика обертывания должна быть консистентна с серверной (если бы она там была для столкновений).
        // Сейчас сервер не делает обертку для столкновений, но клиент должен ее делать для анимации.
        // Переводим в мировые координаты для рендеринга
        let currentXWorld = currentXInTiles * tileSize;

        // Логика "телепортации" на клиенте
        // Важно: эта логика должна быть такой же, как и раньше, но теперь она применяется к currentXWorld,
        // который вычислен на основе серверного времени.
        if (rowData.direction) { // Движется вправо
          if (currentXWorld > VEHICLE_WRAP_UPPER_BOUND_WORLD) {
            // currentXWorld = VEHICLE_WRAP_LOWER_BOUND_WORLD + (currentXWorld - VEHICLE_WRAP_UPPER_BOUND_WORLD) % VEHICLE_WRAP_WIDTH_WORLD;
            // Более простой вариант, если машина "ускакала" далеко:
            const numWraps = Math.floor((currentXWorld - VEHICLE_WRAP_LOWER_BOUND_WORLD) / VEHICLE_WRAP_WIDTH_WORLD);
            currentXWorld -= numWraps * VEHICLE_WRAP_WIDTH_WORLD;
          }
        } else { // Движется влево
          if (currentXWorld < VEHICLE_WRAP_LOWER_BOUND_WORLD) {
            // currentXWorld = VEHICLE_WRAP_UPPER_BOUND_WORLD - (VEHICLE_WRAP_LOWER_BOUND_WORLD - currentXWorld) % VEHICLE_WRAP_WIDTH_WORLD;
            const numWraps = Math.floor((VEHICLE_WRAP_UPPER_BOUND_WORLD - currentXWorld) / VEHICLE_WRAP_WIDTH_WORLD);
            currentXWorld += numWraps * VEHICLE_WRAP_WIDTH_WORLD;
          }
        }
        ref.position.x = currentXWorld;
      });
    }
  });
}