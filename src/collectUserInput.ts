import { gameRoom } from "./main"; // Импортируем gameRoom из того же каталога

function sendMoveCommand(direction: string) {
  if (gameRoom) {
    gameRoom.send("move", { direction });
  } else {
    console.warn("Game room not available to send move command.");
  }
}

document
  .getElementById("forward")
  ?.addEventListener("click", () => sendMoveCommand("forward"));

document
  .getElementById("backward")
  ?.addEventListener("click", () => sendMoveCommand("backward"));

document
  .getElementById("left")
  ?.addEventListener("click", () => sendMoveCommand("left"));

document
  .getElementById("right")
  ?.addEventListener("click", () => sendMoveCommand("right"));

window.addEventListener("keydown", (event) => {
  let direction: string | null = null;
  if (event.key === "ArrowUp") {
    direction = "forward";
  } else if (event.key === "ArrowDown") {
    direction = "backward";
  } else if (event.key === "ArrowLeft") {
    direction = "left";
  } else if (event.key === "ArrowRight") {
    direction = "right";
  }

  if (direction) {
    event.preventDefault(); // Avoid scrolling the page
    sendMoveCommand(direction);
  }
});