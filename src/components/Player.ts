import * as THREE from "three";
import type { MoveDirection } from "../types";
import { metadata as rows, addRows } from "./Map";
import { endsUpInValidPosition } from "../utilities/endsUpInValidPosition";

export const player = Player();

function Player() {
    const player = new THREE.Group();
  
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(15, 15, 20),
      new THREE.MeshLambertMaterial({
        color: "white",
        flatShading: true,
      })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.z = 10;
    player.add(body);
  
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(2, 20, 2),
      new THREE.MeshLambertMaterial({
        color: 0xf0619a,
        flatShading: true,
      })
    );
    cap.position.z = 15;
    cap.position.y = 6;
    cap.castShadow = true;
    cap.receiveShadow = true;
    player.add(cap);


    const eye1 = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 2),
        new THREE.MeshLambertMaterial({
          color: 0x000000,
          flatShading: true,
        })
      );
      eye1.position.z = 18;
      eye1.position.x = -3;
      eye1.position.y = 10;
      eye1.castShadow = true;
      eye1.receiveShadow = true;
      player.add(eye1);

      const eye2 = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 2),
        new THREE.MeshLambertMaterial({
          color: 0x000000,
          flatShading: true,
        })
      );
      eye2.position.z = 18;
      eye2.position.x = 3;
      eye2.position.y = 10;
      eye2.castShadow = true;
      eye2.receiveShadow = true;
      player.add(eye2);



      const playerContainer = new THREE.Group();
      playerContainer.add(player);
    
      return playerContainer;
  }
  export const position: {
    currentRow: number;
    currentTile: number;
  } = {
    currentRow: 0,
    currentTile: 0,
  };
  
  export const movesQueue: MoveDirection[] = [];
  
  export function initializePlayer() {
    // Initialize the Three.js player object
    player.position.x = 0;
    player.position.y = 0;
    player.children[0].position.z = 0;
  
    // Initialize metadata
    position.currentRow = 0;
    position.currentTile = 0;
  
    // Clear the moves queue
    movesQueue.length = 0;
  }
  
  export function queueMove(direction: MoveDirection) {
    const isValidMove = endsUpInValidPosition(
      {
        rowIndex: position.currentRow,
        tileIndex: position.currentTile,
      },
      [...movesQueue, direction]
    );
  
    if (!isValidMove) return;
  
    movesQueue.push(direction);
  }
  
  export function stepCompleted() {
    const direction = movesQueue.shift();
  
    if (direction === "forward") position.currentRow += 1;
    if (direction === "backward") position.currentRow -= 1;
    if (direction === "left") position.currentTile -= 1;
    if (direction === "right") position.currentTile += 1;
  
    // Add new rows if the player is running out of them
    if (position.currentRow > rows.length - 10) addRows();
  
    const scoreDOM = document.getElementById("score");
    if (scoreDOM) scoreDOM.innerText = position.currentRow.toString();
  }