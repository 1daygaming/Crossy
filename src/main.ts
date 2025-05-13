import * as THREE from "three";
import { Renderer } from "./components/Renderer";
import { Camera } from "./components/Camera";
import { DirectionalLight } from "./components/DirectionalLight";
import { player, initializePlayer } from "./components/Player";
import { map, initializeClientMap, syncMapWithServer } from "./components/Map";
import { animateVehicles } from "./animateVehicles";
import { animatePlayer } from "./animatePlayer";
import { hitTest } from "./hitTest";
import * as Colyseus from 'colyseus.js';
import { tileSize } from "./constants";
import "./style.css";
// import "./collectUserInput"; // Будет импортирован динамически

// Интерфейс для состояния игрока на клиенте (соответствует PlayerState на сервере)
interface PlayerStateClient {
  x: number;
  y: number;
  z: number;
  isDead: boolean; // Добавлено для отслеживания состояния "мертв"
  // Можно добавить другие поля, если они есть в PlayerState сервера
}

// Интерфейс для информации о машине на клиенте (включая ссылку на 3D объект)
export interface ClientVehicleInfo {
  initialTileIndex: number; // из VehicleInfoState от сервера
  // Если в VehicleInfoState появятся другие поля, которые нужны клиенту для рендера/анимации,
  // их можно добавить сюда.
  ref: THREE.Object3D;     // Ссылка на созданный 3D объект машины
}

// Обновляем RowStateClient, чтобы поле vehicles содержало ClientVehicleInfo
export interface RowStateClient {
  id: number;                       // от сервера
  tiles: { type: string }[];      // от сервера (массив TileState)
  type?: string;                  // от сервера ("grass", "car", "truck", "road")
  direction?: boolean;            // от сервера (для "car", "truck")
  speed?: number;                 // от сервера (для "car", "truck")
  serverVehiclesData?: any[];     // Оригинальные данные о машинах от сервера (из RowState.vehicles, массив VehicleInfoState)
                                  // Это поле может быть временным или для отладки, или если нужны прямые данные.
  
  // Массив с отрендеренными машинами и ссылками на их 3D объекты
  renderedVehicles?: ClientVehicleInfo[]; 
}

export let gameRoom: Colyseus.Room<any> | null = null; // Укажем <any> для состояния комнаты, если не импортируем GameStateClient
export let currentMapRows: RowStateClient[] = []; // Экспортируемая переменная для хранения состояния карты

let isConnectingOrConnected = false; // Флаг для предотвращения двойного подключения
let isGameOver = false; // Флаг, что игра окончена для локального игрока
let maxScore = 0; // Максимальный достигнутый счет (по y)
let lastReceivedServerTime = 0; // Время сервера, полученное в последнем onStateChange
let clientTimeAtLastServerSnapshot = 0; // Метка времени клиента при получении lastReceivedServerTime

const remotePlayers: { [sessionId: string]: THREE.Object3D } = {}; // Хранилище для 3D-объектов других игроков

const scene = new THREE.Scene();
scene.add(player);
scene.add(map);

const ambientLight = new THREE.AmbientLight();
scene.add(ambientLight);

const dirLight = DirectionalLight();
dirLight.target = player;
player.add(dirLight);

const camera = Camera();
player.add(camera);

const scoreDOM = document.getElementById("score");
const resultDOM = document.getElementById("result-container");
const serverStatusDOM = document.getElementById("server-status");

// Найдем элементы для "Game Over" модального окна, которые вы добавили
const gameOverModalDOM = document.getElementById("game-over-modal");
const finalScoreDOM = document.getElementById("score"); // Используем существующий span для счета в модальном окне

initializeGame();
connectToColyseus();

document
  .querySelector("#retry")
  ?.addEventListener("click", () => {
    initializeGame();
    // Возможно, здесь также нужно будет переподключаться или сбрасывать состояние комнаты,
    // но пока оставим так для простоты реинициализации клиента.
  });

function initializeGame() {
  initializePlayer();
  initializeClientMap();
  if (scoreDOM) scoreDOM.innerText = "0"; // Сбрасываем отображаемый счет
  if (gameOverModalDOM) gameOverModalDOM.style.display = "none"; // Скрываем Game Over при инициализации
  isGameOver = false; // Сбрасываем флаг окончания игры
  maxScore = 0; // Сбрасываем максимальный счет
}

async function connectToColyseus(maxRetries = 3, retryDelay = 2000) {
  if (isConnectingOrConnected && gameRoom) {
    console.warn("Attempting to reconnect to Colyseus while already connected. Aborted.");
    return;
  }
  if (isConnectingOrConnected) { // If gameRoom doesn't exist yet, but connection is in progress
    console.warn("Attempting to connect to Colyseus while a previous connection attempt is still in progress. Aborted.");
    return;
  }
  isConnectingOrConnected = true;

  if (serverStatusDOM) serverStatusDOM.innerText = "Подключение к серверу...";
  const client = new Colyseus.Client('ws://192.168.0.129:2567');
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const roomConnection = await client.joinOrCreate("my_room");
      gameRoom = roomConnection;
      console.log("Successfully joined room:", gameRoom.name);
      console.log("Session ID:", gameRoom.sessionId);
      if (serverStatusDOM) serverStatusDOM.innerText = "Подключено к серверу!";

      import("./collectUserInput").then(() => {
        console.log("User input collector initialized.");
      }).catch(err => console.error("Failed to load user input collector:", err));

      gameRoom.onStateChange((newState: any) => {
        console.log("Room state changed (raw):", newState);
        if (!gameRoom || !gameRoom.sessionId) return;

        // Сохраняем последнее известное время сервера и метку времени клиента
        if (typeof newState.serverTime === 'number') {
          lastReceivedServerTime = newState.serverTime;
          clientTimeAtLastServerSnapshot = Date.now(); // Фиксируем время клиента в момент получения серверного времени
          console.log("Client: Received serverTime:", lastReceivedServerTime, "Client snapshot at:", clientTimeAtLastServerSnapshot);
        }

        // Обновляем или создаем представления для всех игроков в текущем состоянии
        newState.players.forEach((playerState: PlayerStateClient, sessionId: string) => {
          if (sessionId === gameRoom!.sessionId) {
            // Это наш локальный игрок
            const localPlayerState = playerState;
            console.log(`Client: Received state for local player ${sessionId}: x=${localPlayerState.x}, y=${localPlayerState.y}, z=${localPlayerState.z}, isDead=${localPlayerState.isDead}`);
            
            // Обновляем максимальный счет, если игрок еще не мертв
            if (!localPlayerState.isDead) {
              maxScore = Math.max(maxScore, localPlayerState.y);
              if (scoreDOM) scoreDOM.innerText = maxScore.toString(); // Обновляем текущий счет на экране
            }

            // Обновляем позицию игрока, даже если он мертв (чтобы он остался на месте смерти)
            console.log(`Client: Local player 3D position BEFORE update: x=${player.position.x}, y=${player.position.y}, z=${player.position.z}`);
            player.position.x = localPlayerState.x * tileSize;
            player.position.y = localPlayerState.y * tileSize;
            player.position.z = localPlayerState.z * tileSize;
            console.log(`Client: Local player 3D position AFTER update: x=${player.position.x}, y=${player.position.y}, z=${player.position.z}`);

            // Проверяем, не умер ли игрок
            if (localPlayerState.isDead && !isGameOver) {
              showGameOver();
            }
          } else {
            // Это другой (удаленный) игрок
            if (!remotePlayers[sessionId]) {
              // Игрока еще нет на сцене, создаем его
              console.log(`Client: Creating remote player ${sessionId}`);
              const remotePlayerGeometry = new THREE.BoxGeometry(tileSize * 0.8, tileSize * 0.8, tileSize * 0.8); // Чуть меньше основного игрока
              const remotePlayerMaterial = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
              const remotePlayerMesh = new THREE.Mesh(remotePlayerGeometry, remotePlayerMaterial);
              remotePlayerMesh.position.x = playerState.x * tileSize;
              remotePlayerMesh.position.y = playerState.y * tileSize;
              remotePlayerMesh.position.z = playerState.z * tileSize;
              scene.add(remotePlayerMesh);
              remotePlayers[sessionId] = remotePlayerMesh;
            } else {
              // Игрок уже есть, обновляем его позицию
              const remotePlayerMesh = remotePlayers[sessionId];
              remotePlayerMesh.position.x = playerState.x * tileSize;
              remotePlayerMesh.position.y = playerState.y * tileSize;
              remotePlayerMesh.position.z = playerState.z * tileSize;
            }
          }
        });

        // Удаляем игроков, которых больше нет в состоянии
        for (const sessionIdInClient in remotePlayers) {
          if (!newState.players.has(sessionIdInClient)) {
            console.log(`Client: Removing remote player ${sessionIdInClient}`);
            scene.remove(remotePlayers[sessionIdInClient]);
            delete remotePlayers[sessionIdInClient];
          }
        }

        // Обработка карты
        if (newState.mapRows) {
          // Обновляем currentMapRows. 
          // Теперь нам нужно не просто скопировать newState.mapRows, 
          // а преобразовать его в массив RowStateClient[], сохранив данные с сервера
          // и подготовив место для renderedVehicles.
          currentMapRows = newState.mapRows.map((serverRow: any) => {
            return {
              id: serverRow.id,
              tiles: Array.from(serverRow.tiles).map((tile: any) => ({ type: tile.type })),
              type: serverRow.type,
              direction: serverRow.direction,
              speed: serverRow.speed,
              serverVehiclesData: Array.from(serverRow.vehicles), // Копируем данные о машинах с сервера
              renderedVehicles: [] // Инициализируем пустым массивом, будет заполнен в syncMapWithServer
            } as RowStateClient;
          });
          syncMapWithServer(currentMapRows);
        }
      });

      gameRoom.onLeave((code) => {
        console.log("Left room with code:", code);
        if (serverStatusDOM) serverStatusDOM.innerText = "Отключено от сервера.";
        gameRoom = null;
        isConnectingOrConnected = false; // Сбрасываем флаг
      });
      return; // Успешное подключение, выход из цикла
    } catch (e) {
      retries++;
      console.error(`Join error (attempt ${retries}/${maxRetries}):`, e);
      if (serverStatusDOM) {
        serverStatusDOM.innerText = `Ошибка подключения (попытка ${retries}/${maxRetries})...`;
      }
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        if (serverStatusDOM) {
          serverStatusDOM.innerText = "Не удалось подключиться к серверу. Пожалуйста, попробуйте обновить страницу.";
        }
        gameRoom = null;
        isConnectingOrConnected = false; // Сбрасываем флаг
        break; // Все попытки исчерпаны
      }
    }
  }
}

const renderer = Renderer();
renderer.setAnimationLoop(animate);

function animate() {
  // if (isGameOver) return; // Если нужно полностью остановить анимацию

  let currentEffectiveServerTimeMs = lastReceivedServerTime;
  if (clientTimeAtLastServerSnapshot > 0) { // Убедимся, что у нас есть точка отсчета
    const clientTimeElapsedSinceSnapshot = Date.now() - clientTimeAtLastServerSnapshot;
    currentEffectiveServerTimeMs = lastReceivedServerTime + clientTimeElapsedSinceSnapshot;
  }

  animateVehicles(currentEffectiveServerTimeMs); // Передаем эффективное серверное время
  animatePlayer();
  hitTest();
  renderer.render(scene, camera);
}

function showGameOver() {
  isGameOver = true;
  console.log("Game Over! Final score:", maxScore);
  if (finalScoreDOM) finalScoreDOM.innerText = maxScore.toString();
  if (gameOverModalDOM) {
    // Убедимся, что элемент существует и обновляем его содержимое и видимость
    const scoreSpan = gameOverModalDOM.querySelector('#score'); // Ищем span внутри модального окна
    if (scoreSpan) {
      scoreSpan.textContent = maxScore.toString();
    }
    gameOverModalDOM.style.display = 'flex'; // Показываем модальное окно
  }
  // Здесь можно остановить анимацию или другие действия, если необходимо.
  // Например, можно закомментировать renderer.setAnimationLoop(animate);
  // или добавить флаг в animate(), чтобы она ничего не делала.
  // Пока не будем останавливать, чтобы видеть других игроков.
}