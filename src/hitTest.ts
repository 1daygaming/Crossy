import * as THREE from "three";
// import { metadata as rows } from "./components/Map"; // Удаляем старый импорт
import { currentMapRows } from "./main"; // Импортируем currentMapRows
import { player, position } from "./components/Player";

const resultDOM = document.getElementById("result-container");
const finalScoreDOM = document.getElementById("final-score");

export function hitTest() {
  // Используем currentMapRows вместо старого rows (ранее metadata)
  // Доступ к position.currentRow может быть небезопасным, если ряды на клиенте 
  // и сервере нумеруются по-разному или если position не синхронизирован с сервером.
  // Пока предполагаем, что position.currentRow корректно отражает текущий ряд игрока 
  // в контексте массива currentMapRows.
  const row = currentMapRows[position.currentRow - 1];
  if (!row) return;

  // Проверяем, что это ряд с машинами и у него есть необходимые свойства
  if ((row.type === "car" || row.type === "truck") && row.vehicles) {
    const playerBoundingBox = new THREE.Box3();
    playerBoundingBox.setFromObject(player);

    row.vehicles.forEach((vehicle: any) => { // Укажем any для vehicle
      // Предполагаем, что vehicle.ref это THREE.Object3D
      const ref = vehicle.ref as THREE.Object3D | undefined;
      // if (!ref) throw Error("Vehicle reference is missing"); // Заменяем на return, чтобы не падать
      if (!ref) return; // Пропускаем, если нет ссылки на 3D объект

      const vehicleBoundingBox = new THREE.Box3();
      vehicleBoundingBox.setFromObject(ref);

      if (playerBoundingBox.intersectsBox(vehicleBoundingBox)) {
        if (!resultDOM || !finalScoreDOM) return;
        resultDOM.style.visibility = "visible";
        finalScoreDOM.innerText = position.currentRow.toString();
      }
    });
  }
}