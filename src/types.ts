import * as THREE from "three";

export type RowType = "forest" | "car" | "truck";
export type MoveDirection = "forward" | "backward" | "left" | "right";
export type Row =
  | {
      type: "forest";
      trees: { tileIndex: number; height: number }[];
    }
  | {
      type: "car";
      direction: boolean;
      speed: number;
      vehicles: {
        initialTileIndex: number;
        color: THREE.ColorRepresentation;
        ref?: THREE.Object3D;
      }[];
    }
  | {
      type: "truck";
      direction: boolean;
      speed: number;
      vehicles: {
        initialTileIndex: number;
        color: THREE.ColorRepresentation;
        ref?: THREE.Object3D;
      }[];
    };