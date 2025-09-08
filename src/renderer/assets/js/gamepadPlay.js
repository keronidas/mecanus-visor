export class GamepadManager {
  static gamepadIndex = null

  static init() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connected:', e.gamepad)
      GamepadManager._setGamepad(e.gamepad)
    })

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('❌ Gamepad disconnected:', e.gamepad)
      GamepadManager._clearGamepad(e.gamepad)
    })

    // Poll inicial con pequeño retraso
    setTimeout(() => GamepadManager._pollGamepads(), 500)
  }

  static _pollGamepads() {
    const gamepads = navigator.getGamepads()
    for (const gp of gamepads) {
      if (gp && GamepadManager.gamepadIndex === null) {
        GamepadManager._setGamepad(gp)
        break
      }
    }
  }

  static _setGamepad(gp) {
    if (!gp) return
    if (GamepadManager.gamepadIndex === null) {
      GamepadManager.gamepadIndex = gp.index
      console.log('✅ Asignado gamepad:', gp.index, gp.id)
    }
  }

  static _clearGamepad(gp) {
    if (gp.index === GamepadManager.gamepadIndex) {
      console.log(`🔄 Gamepad desconectado: ${gp.index}`)
      GamepadManager.gamepadIndex = null
    }
  }

  static getGamepad() {
    if (GamepadManager.gamepadIndex === null) return null
    const gamepads = navigator.getGamepads()
    return gamepads[GamepadManager.gamepadIndex] || null
  }

  static update() {
    GamepadManager._pollGamepads()
  }
}
