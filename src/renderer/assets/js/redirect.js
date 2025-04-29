import { GamepadManager } from './gamepadManager.js'

GamepadManager.init()

let lastButton1Pressed = false
let lastButton2Pressed = false
let alreadyNavigated = false

function listenGamepad() {
  const gamepadRight = GamepadManager.getActiveGamepad('right')

  if (gamepadRight && gamepadRight.buttons) {
    const button1Pressed = gamepadRight.buttons[1]?.pressed
    const button2Pressed = gamepadRight.buttons[2]?.pressed
    const currentPage = window.location.pathname

    if (!alreadyNavigated) {
      if (button1Pressed && !lastButton1Pressed) {
        if (!currentPage.endsWith('game.html')) {
          alreadyNavigated = true
          window.location.href = 'game.html'
        }
      } else if (button2Pressed && !lastButton2Pressed) {
        console.log('AAA')
        // Si quieres navegar con botón 2, hazlo aquí y pon alreadyNavigated = true
      } else if (!button1Pressed && !button2Pressed && !currentPage.endsWith('index.html')) {
        alreadyNavigated = true
        window.location.href = 'index.html'
      }
    }

    lastButton1Pressed = button1Pressed
    lastButton2Pressed = button2Pressed
  }

  requestAnimationFrame(listenGamepad)
}

listenGamepad()
