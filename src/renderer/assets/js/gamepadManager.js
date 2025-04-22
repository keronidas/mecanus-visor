export class GamepadManager {
  static gamepads = {
    joystick: null,
    left: null,
    right: null
  }

  static init() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connected:', e.gamepad)
      GamepadManager._identify(e.gamepad)
    })

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('❌ Gamepad disconnected:', e.gamepad)
      GamepadManager._clearGamepad(e.gamepad)
    })

    // Poll inicial con pequeño retraso para asegurar que están listos
    setTimeout(() => GamepadManager._pollGamepads(), 500)
  }

  static _pollGamepads() {
    const gamepads = navigator.getGamepads()
    for (const gamepad of gamepads) {
      if (gamepad) GamepadManager._identify(gamepad)
    }
  }

  static _identify(gp) {
    if (!gp) return

    const { joystick, left, right } = GamepadManager.gamepads

    // Si ya está asignado, no hacemos nada
    if ([joystick, left, right].includes(gp.index)) return

    // Asignar joystick por forma
    if (gp.buttons.length === 5 && gp.axes.length === 2 && joystick === null) {
      GamepadManager.gamepads.joystick = gp.index
      console.log('✅ Asignado joystick:', gp.index)
    }

    // Asignar mandos izquierdo y derecho
    else if (gp.buttons.length >= 12) {
      const lastButton = gp.buttons[gp.buttons.length - 1]
      const isPressed = lastButton.pressed || lastButton.value > 0.9

      // Si está presionado y left no está asignado, es el izquierdo
      if (isPressed && left === null) {
        GamepadManager.gamepads.left = gp.index
        console.log('✅ Asignado mando izquierdo:', gp.index)
      }

      // Si no está presionado y right no está asignado, es el derecho
      else if (!isPressed && right === null) {
        GamepadManager.gamepads.right = gp.index
        console.log('✅ Asignado mando derecho:', gp.index)
      }
    }
  }

  static _clearGamepad(gp) {
    for (const [type, index] of Object.entries(GamepadManager.gamepads)) {
      if (index === gp.index) {
        GamepadManager.gamepads[type] = null
        console.log(`🔄 Gamepad ${type} desconectado`)
      }
    }
  }

  static getGamepad(type) {
    const index = GamepadManager.gamepads[type]
    if (index === null) return null
    const gamepads = navigator.getGamepads()
    return gamepads[index] || null
  }

  static update() {
    GamepadManager._pollGamepads()
  }

  static getActiveGamepad(type) {
    // Si ya está asignado, simplemente lo devuelve, sin reidentificar
    return GamepadManager.getGamepad(type)
  }
}
