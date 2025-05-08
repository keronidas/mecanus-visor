import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader'
import { RGBELoader } from 'three/addons/loaders/RGBELoader'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GamepadManager } from './gamepadManager'
import toastr from 'toastr'

// Importar los estilos de Toastr
import 'toastr/build/toastr.min.css'
function ajustarPos(obj) {
  const dosPi = 2 * Math.PI;

  function ajustar(punto) {
    if (!punto) return;
    punto.ejeX = ((punto.ejeX % dosPi) + dosPi) % dosPi;
    punto.ejeY = ((punto.ejeY % dosPi) + dosPi) % dosPi;
  }

  ajustar(obj.home);
  ajustar(obj[8]);
  ajustar(obj[9]);
  ajustar(obj[10]);
}
const motor1Torreta = 'EA000055000003AABB'
const motor2Torreta = 'EA000055000004AABB'
const levantar30Torreta = 'EA0008550000080000000041F00000AABB'
const movimientoTorreta = 'EA000855000007C0DB333341F00000AABB'
const pararMotor1Torreta = 'EA000055000005AABB'
const pararMotor2Torreta = 'EA000055000006AABB'
let estadoMotorArrancado = false
// Naranja: rgba(255,64,0)
const modeloGroup = new THREE.Group()
// const hudVisor = document.getElementById('dron-container')
// hudVisor.style.visibility = 'hidden'
let boton5Pulsado = false
const config = {
  camera: {
    fov: 75,
    near: 0.1,
    far: 5000,
    position: { x: 0, y: 0, z: 0 }
  },
  controls: {
    rotationSpeed: 2.0,
    verticalMin: -Math.PI / 2 + Math.PI / 2.6,
    verticalMax: Math.PI / 2
  },
  drone: {
    orbitSpeed: 0.005,
    orbitRadius: 100,
    height: 10,
    bobAmount: 1
  },
  gamepad: {
    deadZone: 0.15
  },
  position: {
    home: { ejeX: 0, ejeY: 0 },
    8: { ejeX: 0, ejeY: 0 },
    9: { ejeX: 0, ejeY: 0 },
    10: { ejeX: 0, ejeY: 0 }
  }
}

let marcoIA = ''
let min = 0
let max = 0.7
let now = min
let phase = false
let top = false
let returnMomentHome = false
let returnMoment8 = false
let returnMoment9 = false
let returnMoment10 = false
let mixer // Variable para el AnimationMixer
let actions = {} // Objeto para almacenar las acciones de animación
let scene, renderer, camera
let droneInstance, trackingFrame
let followDrone = false
let showTrackingFrame = false
let boton0pulsado = false
let boton1pulsado = false
let trackingMode = false
const clock = new THREE.Clock()
let lastButtonPressTime = 0
let zoomLevel = 1
const zoomSpeed = 4
const minZoom = 1
const maxZoom = 20
let ejex = ''
let ejey = ''
let zoomingMax = false
let zoomingMin = false
let anguloDronCamaraX = 0
let anguloDronCamaraY = 0
let targetDistance = 3500
let secondTracking = false
let efectiveWatch = targetDistance / zoomLevel
let ia_status = false
let target_status = false
GamepadManager.init()
document.documentElement.style.setProperty('--zoomLevel', zoomLevel)

class Map {
  constructor(initialZoom = 16) {
    this.zoomLevel = initialZoom
    this.zoomMapSpeed = 1
    this.minZoomMap = 7
    this.maxZoomMap = 16
    this.targetCoords = [40.469519, -3.615917]

    this.initContainer()
    this.initMap()
    this.update()
  }
  console() {
    console.log('Mapa Cargado')
  }
  initContainer() {
    this.element = document.createElement('div')
    this.element.id = 'map'
    this.element.style.cssText = `
      width: 13.5%; 
      clip-path: polygon(100% 100%, 100% 0%, 40% 0%, 0% 100%);
      height: 13.5%; 
      background: transparent !important;
       backdrop-filter: blur(2px);
      position: absolute; 
      bottom: 1%;
      right: 0.6%;
      margin-bottom: 4px;
      z-index: 30;
      overflow: hidden;
      background: #e8e8e8;

    `
    document.body.appendChild(this.element)
  }

  initMap() {
    this.map = L.map(this.element, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      opacity: 0.8
    }).addTo(this.map)
    this.map.setView(this.targetCoords, this.zoomLevel)
  }

  update() {
    this.map.setZoom(this.maxZoomMap - zoomLevel / 3)
  }

  setZoom(newZoom) {
    if (!this.map) return

    newZoom = Math.max(this.minZoomMap, Math.min(this.maxZoomMap, newZoom))

    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.map.setZoom(this.zoomLevel)
    }
  }
}
class Marcadores {
  constructor() {
    this.ia = document.createElement('div')
    this.target = document.createElement('div')
    this.initStyles()
  }

  initStyles() {
    this.ia.style.cssText = `
      position: fixed;
      top: 56.6%;
      left: 97.1%;
      clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 70%);
      width: 4.2%;
      height: 13%;
      background-color: transparent;
      transform: translate(-50%, -50%);
      z-index: 10;
      pointer-events: none;`

    this.target.style.cssText = `
      position: fixed;
      top: 42.8%;
      left: 97.1%;
      width: 4.2%;
      height: 13%;
      clip-path: polygon(0% 100%, 100% 100%, 100% 0%, 0% 30%);
      background-color: transparent;
      transform: translate(-50%, -50%);
      z-index: 10;
      pointer-events: none;`

    document.body.appendChild(this.ia)
    document.body.appendChild(this.target)
  }

  activateIA() {
    ia_status = !ia_status
  }

  activateTarget() {
    target_status = !target_status
  }

  update() {
    if (ia_status) {
      this.ia.style.backgroundColor = `blue`
    } else {
      this.ia.style.backgroundColor = 'transparent'
    }
    if (target_status) {
      this.target.style.backgroundColor = 'rgba(255,64,0)'
    } else {
      this.target.style.backgroundColor = 'transparent'
    }
  }
}

// Para que funcione, asegúrate de instanciar la clase:

class Viewfinder {
  constructor() {
    // Crear elementos
    this.container = document.createElement('div')
    this.circle = document.createElement('div')
    this.lineLeft = document.createElement('div')
    this.lineRight = document.createElement('div')

    this.initStyles()
    document.body.appendChild(this.container)
  }

  initStyles() {
    // Estilo del contenedor
    this.container.style.cssText = `
      position: fixed;
      top: 92.5%;
      left: 92.4%;
      transform: translate(-50%, -50%);
      z-index: 30;
      pointer-events: none;
    `

    // Estilo del círculo central
    this.circle.style.cssText = `
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background-color: black;
      border: 2px solid rgba(255,64,0);
      box-sizing: border-box;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `

    // Estilo de las líneas (compartido)
    const lineStyle = `
      position: absolute;
      bottom: 50%;
      height: 4px;
      background-color: rgba(255,64,0);
      width: 50px;
      transform-origin: left center;
    `

    // Línea izquierda
    this.lineLeft.style.cssText =
      lineStyle +
      `
      left: 50%;
      transform: translate(0, -50%) rotate(180deg);
    `

    // Línea derecha
    this.lineRight.style.cssText =
      lineStyle +
      `
      left: 50%;
      transform: translate(0, -50%);
    `

    // Añadir elementos al contenedor
    this.container.appendChild(this.lineLeft)
    this.container.appendChild(this.lineRight)
    // this.container.appendChild(this.circle)
  }

  // Método para actualizar el ángulo de las líneas
  updateAngle(angleDegrees, eje) {
    const angle = angleDegrees / 2 // Dividimos el ángulo para ambas direcciones
    this.lineLeft.style.transform = `translate(0, -50%) rotate(${180 - angle - eje + 180}deg)`
    this.lineRight.style.transform = `translate(0, -50%) rotate(${angle - eje + 180}deg)`
  }

  // Método para actualizar la longitud de las líneas
  updateLength(lengthPx) {
    this.lineLeft.style.width = `${lengthPx}px`
    this.lineRight.style.width = `${lengthPx}px`
  }
}
class DataInfo {
  constructor(text = 'Grados') {
    this.element = document.createElement('div')
    this.horizontalAxes = document.createElement('div')
    this.verticalAxes = document.createElement('div') // Corregido el nombre (de Vertical a vertical)

    this.initStyles()
    this.setText(text)
    this.create() // Llamamos al método create para construir la estructura
    document.body.appendChild(this.element)
  }

  initStyles() {
    // Estilo del contenedor principal
    this.element.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2;
    `

    // Estilo para el display horizontal (ahora centrado correctamente)
    this.horizontalAxes.style.cssText = `
      position: absolute;
      top: 2%;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      color: black;
      padding: 8px;
      font-family: Arial, sans-serif;
      font-size: 36px;
      font-weight: bold;
      display: flex;
      flex-direction: column;
      text-align: center;
      z-index: 20;
    `

    // Estilo para el display vertical (añadido)
    this.verticalAxes.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      width: 100px;
      color: black;
      padding: 8px;
      font-family: Arial, sans-serif;
      font-size: 36px;
      font-weight: bold;
      display: flex;
      flex-direction: column;
      text-align: center;
      z-index: 20;
    `
  }

  setText(ejeX, ejeY) {
    ejeY = parseFloat(ejeY)
    ejeY = ejeY.toFixed(1)
    this.horizontalAxes.innerText = ejeX + 'º'
    this.verticalAxes.innerText = ejeY + 'º'
  }

  update(ejeX, ejeY) {
    let ejeC = (360 - ejeX).toFixed(1)
    this.setText(ejeC, ejeY)
  }

  create() {
    // Añadimos ambos elementos al contenedor principal
    this.element.appendChild(this.horizontalAxes)
    this.element.appendChild(this.verticalAxes)
  }
}
class distanceInformation {
  constructor() {
    this.element = document.createElement('div')
    this.distance = document.createElement('div')
    this.positionEarthX = document.createElement('div')
    this.positionEarthY = document.createElement('div')
    this.hour = document.createElement('div')
    this.date = document.createElement('div')
    this.initStyles()
    this.create()
    document.body.appendChild(this.element)
  }
  initStyles() {
    this.element.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      z-index: 20;
    `

    this.distance.style.cssText = `
      position: fixed;
      top: 60%;
      right: 30%;
      color: black;
      font-family: Arial, sans-serif;
      font-size: 26px;
      font-weight:bold;
      padding: 8px 12px;
      z-index: 20;
    `
    this.date.style.cssText = `
    position: fixed;
    color: black;
    font-family: Arial, sans-serif;
    font-size: 22px;
    font-weight:bold;
    right: 1%;
    top: 1.7%;
    `
    this.hour.style.cssText = `
    position: fixed;
    color: black;
    font-family: Arial, sans-serif;
    font-size: 22px;
    right: 1%;
    top: 4%;
    `
    this.positionEarthX.style.cssText = `
      position: fixed;
      top: 64%;
      right: 30%;
      color: black;
      font-family: Arial, sans-serif;
      font-size: 26px;
      font-weight:bold;
      padding: 8px 12px;
      z-index: 20;
    `
    this.positionEarthY.style.cssText = `
      position: fixed;
      top: 68%;
      right: 30%;
      color: black;
      font-family: Arial, sans-serif;
      font-size: 26px;
      font-weight:bold;
      padding: 8px 12px;
      z-index: 20;
    `
  }
  create() {
    this.element.appendChild(this.distance)
    this.element.appendChild(this.positionEarthX)
    this.element.appendChild(this.positionEarthY)
    this.element.appendChild(this.hour)
    this.element.appendChild(this.date)
    this.distance.textContent = `TRG: ${targetDistance}`
    this.positionEarthX.textContent = `3º36'57" W`
    this.positionEarthY.textContent = `40º28'08" N`
    this.hour.textContent = new Date().toLocaleTimeString('es-ES')
    this.date.textContent = new Date().toLocaleDateString('es-ES')
  }
  update(msg) {
    this.distance.textContent = `TRG: ${msg}m`
    this.hour.textContent = new Date().toLocaleTimeString('es-ES')
  }
}
class ZoomIndicator {
  constructor() {
    this.element = document.createElement('div')
    this.initStyles()
    document.body.appendChild(this.element)
  }

  initStyles() {
    this.element.style.cssText = `
      position: fixed;
      top: 68%;
      left: calc(32%);
      color: black;
      font-family: Arial, sans-serif;
      font-size: 26px;
      font-weight:bold;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 20;
    `
  }

  update(zoomLevel) {
    this.element.textContent = ` x${(zoomLevel * 1.525 - 0.5).toFixed(1)}`

    // this.element.style.display = followDrone ? 'block' : 'none'
  }
}
class Cross {
  constructor() {
    this.element = document.createElement('div')
    this.horizontalLineLeft = document.createElement('div')
    this.verticalLineBot = document.createElement('div')
    this.horizontalLineRight = document.createElement('div')
    this.verticalLineTop = document.createElement('div')
    this.circle = document.createElement('div')
    this.initStyles()
    this.createCross()
    document.body.appendChild(this.element)
  }

  initStyles() {
    this.element.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 2;
    `
    this.circle.style.cssText = `
    position: absolute;
    top:calc(50%) ;
    width: 20px;
    height: 20px;
    border-radius: 50%; /* Lo convierte en círculo */
    border:2px solid black;
    `

    // Línea horizontal derecha
    this.horizontalLineRight.style.cssText = `
      position: absolute;
      width: 20px; 
      height: 5px;
      background-color: black;
      top:calc(50%) ;
      left: 20px;
      transform: translateY(-50%);
    `

    // Línea vertical inferior
    this.verticalLineBot.style.cssText = `
      position: absolute;
      height: 20px;
      width: 5px;
      background-color: black;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
    `

    // Línea horizontal izquierda
    this.horizontalLineLeft.style.cssText = `
      position: absolute;
      width: 20px; 
      height: 5px;
      background-color: black;
      bottom: 50% ; 
      left: -40px;
      transform: translateY(50%);
    `

    // Línea vertical superior
    this.verticalLineTop.style.cssText = `
      position: absolute;
      height: 20px;
      width: 5px;
      background-color: black;
      top: -40px;
      left:50% ;
      transform: translateX(-50%);
    `
  }
  update() {
    const newPositionH = 20 - ((1 - zoomLevel) * 22.5) / 2
    const newPositionV = 20 - ((1 - zoomLevel) * 40) / 2

    this.horizontalLineRight.style.left = `${newPositionV}px`
    this.horizontalLineLeft.style.left = `${-20 - newPositionV}px`
    this.verticalLineBot.style.top = `${newPositionH}px`
    this.verticalLineTop.style.top = `${-20 - newPositionH}px`
    this.circle.style.width = `${zoomLevel * 10}px`
    this.circle.style.height = `${zoomLevel * 10}px`
    this.circle.style.top = `calc(50% - ${this.circle.offsetWidth / 2}px)`
    this.circle.style.left = `calc(50% - ${this.circle.offsetWidth / 2}px)`
  }

  createCross() {
    this.element.appendChild(this.horizontalLineRight)
    this.element.appendChild(this.verticalLineBot)
    this.element.appendChild(this.horizontalLineLeft)
    this.element.appendChild(this.verticalLineTop)
    this.element.appendChild(this.circle)
  }
}
class TrackingFrame {
  constructor() {
    this.element = document.createElement('div')
    this.initStyles()
    document.body.appendChild(this.element)
    this.hide()
    this.isCentered = false
  }

  initStyles() {
    this.element.style.cssText = `
      position: fixed;
      width: 40px;
      height: 37.50px;
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 2;
      visibility: hidden;
      border: transparent;
      boxShadow: transparent;
    `
  }

  update(position, camera) {
    const projected = position.clone().project(camera)
    const isBehindCamera = projected.z > 1
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth
    const y = (-(projected.y * 0.5) + 0.5) * window.innerHeight
    efectiveWatch = targetDistance / zoomLevel
    // if (isDetected) {
    //   efectiveWatch = efectiveWatch * 2
    // }

    if (efectiveWatch <= 80) {
      if (
        trackingMode &&
        x > window.innerWidth / 2 - 500 &&
        x < window.innerWidth / 2 + 500 &&
        y > window.innerHeight / 2 - 437.5 &&
        y < window.innerHeight / 2 + 437.5
      ) {
        followDrone = true
      }

      this.element.style.border = `5px solid rgba(0, 143, 57)`
      marcoIA = 'verde'
      this.element.style.boxShadow = `0 0 10px  rgba(0, 143, 57, 0.8)`
    } else {
      if (efectiveWatch <= 132 && efectiveWatch > 60) {
        if (
          trackingMode &&
          x > window.innerWidth / 2 - 500 &&
          x < window.innerWidth / 2 + 500 &&
          y > window.innerHeight / 2 - 437.5 &&
          y < window.innerHeight / 2 + 437.5
        ) {
          followDrone = true
        }
        this.element.style.border = `5px solid rgba(229, 190, 1)`
        marcoIA = 'amarillo'
        this.element.style.boxShadow = `0 0 10px  rgba(229, 190, 1, 0.8)`
        // hudVisor.style.visibility = 'visible'
      } else {
        if (efectiveWatch <= 160 && efectiveWatch > 132) {
          boton0pulsado = true

          followDrone = false
          this.isCentered = false
          this.element.style.border = `5px solid rgba(255,64,0)`
          marcoIA = 'naranja'
          target_status = false
          marcador.update()
          this.element.style.boxShadow = `0 0 10px  rgba(255,64,0, 0.8)`
          // hudVisor.style.visibility = 'hidden'
        } else {
          boton0pulsado = true

          followDrone = false
          this.isCentered = false
          this.element.style.border = `transparent`
          this.element.style.boxShadow = `none`
          marcoIA = 'naranja'
        }
      }
    }

    if (isBehindCamera) {
      this.element.style.visibility = 'hidden'
      this.element.style.opacity = '0'
      boton1pulsado = false
      return
    } else {
      this.element.style.visibility = 'visible'
      this.element.style.opacity = '1'
      boton1pulsado = true
    }

    if (this.isCentered) {
      this.element.style.left = '50%'
      this.element.style.top = '50%'
      this.element.style.visibility = showTrackingFrame ? 'visible' : 'hidden'
    } else {
      this.element.style.left = `${x}px`
      this.element.style.top = `${y}px`
      this.element.style.visibility = showTrackingFrame ? 'visible' : 'hidden'
    }
  }

  toggle() {
    showTrackingFrame = !showTrackingFrame
    trackingMode = false
    this.element.style.visibility = showTrackingFrame ? 'visible' : 'hidden'
    this.element.style.opacity = showTrackingFrame ? '1' : '0'
    this.isCentered = false
  }

  center() {
    this.isCentered = true
    if (showTrackingFrame) {
      this.element.style.left = '50%'
      this.element.style.top = '50%'
    }
  }

  hide() {
    showTrackingFrame = false
    trackingFrame = false
    this.element.style.visibility = 'hidden'
  }
}
class Drone {
  constructor(model) {
    this.model = model
    this.angle = 0
    this.position = new THREE.Vector3()

    this.updatePosition()
  }

  updatePosition() {
    this.angle += config.drone.orbitSpeed
    this.position.x = config.drone.orbitRadius * Math.cos(this.angle * 1.3) * 2
    this.position.z =
      config.drone.orbitRadius * Math.sin(this.angle * 0.7) +
      2000 +
      1700 * Math.cos(clock.getElapsedTime() / 12)
    this.position.y =
      config.drone.height +
      Math.sin(this.angle * 2) * config.drone.bobAmount +
      400 +
      100 * Math.cos(clock.getElapsedTime() / 12)
    let angleInRadiansX = -Math.atan2(this.position.z, this.position.x) + Math.PI + Math.PI / 2
    let angleInRadiansY = Math.atan2(this.position.y, this.position.z)
    targetDistance = ` ${Math.sqrt(
      this.position.x * this.position.x +
      this.position.y * this.position.y +
      this.position.z * this.position.z
    ).toFixed(1)}`
    anguloDronCamaraX = angleInRadiansX
    anguloDronCamaraY = angleInRadiansY
    this.model.position.copy(this.position)
    this.model.rotation.set(0, this.angle, Math.sin(this.angle) * 0.2)
  }

  update() {
    this.updatePosition()
  }
}
const marcador = new Marcadores()
class JoystickControls {
  constructor(camera) {
    this.camera = camera
    this.yaw = -Math.PI / 2
    this.pitch = 0
    ejex = this.yaw
    this.rightButtonPressStart = null
    this.homeButtonPressed = false
    this.homeButtonHoldTime = 0
  }

  increaseAngles(gradosBusqueda) {
    if (trackingMode) {
      this.yaw -= 0.002
      const gradoActual = (this.pitch.toFixed(3) * 180) / Math.PI

      if (gradoActual < gradosBusqueda) {
        this.pitch += 0.001
      }
      if (gradoActual > gradosBusqueda) {
        this.pitch -= 0.001
      }
    }
  }
  updateJoystick() {
    this.yaw = anguloDronCamaraX
    this.pitch = anguloDronCamaraY
  }
  goPosition(valuex, valuey, zoom = 1) {
    valuex = (valuex.toFixed(2) * 180) / Math.PI
    valuey = (valuey.toFixed(2) * 180) / Math.PI
    const gradoxActual = (this.yaw.toFixed(2) * 180) / Math.PI
    const gradoyActual = (this.pitch.toFixed(2) * 180) / Math.PI

    if (gradoxActual < valuex) {
      this.yaw += 0.01 / zoom
    }
    if (gradoxActual > valuex) {
      this.yaw -= 0.01 / zoom
    }
    if (gradoyActual < valuey) {
      this.pitch += 0.01 / zoom
    }
    if (gradoyActual > valuey) {
      this.pitch -= 0.01 / zoom
    }
    if (gradoxActual === valuex && gradoyActual === valuey) {
      returnMomentHome = false
      returnMoment8 = false
      returnMoment9 = false
      returnMoment10 = false
    }
  }
  update(delta) {
    const gamepadRight = GamepadManager.getActiveGamepad('right')
    const gamepad = GamepadManager.getActiveGamepad('joystick')
    const gamepadLeft = GamepadManager.getActiveGamepad('left')
    ejey = this.pitch
    ejex = this.yaw
    if (!gamepad) return

    if (!gamepadRight.buttons[4]?.touched || gamepadRight.buttons[4]?.value < 1) {
      secondTracking = false

    }
    if (!gamepadRight.buttons[3]?.touched && gamepadRight.buttons[3]?.value < 1) {
      if (estadoMotorArrancado) {
        window.api.enviarComandoUDP(pararMotor1Torreta);
        window.api.enviarComandoUDP(pararMotor2Torreta);
        estadoMotorArrancado = false

      }
    }

    if (gamepadRight.buttons[3]?.touched && gamepadRight.buttons[3]?.value > 0) {
      trackingMode = true
      if (trackingMode) {
        updateCameraZoom(10)
        if (!estadoMotorArrancado) {
          estadoMotorArrancado = !estadoMotorArrancado
          const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

          const ejecutarComandos = async () => {
            console.log("bucle torreta")
            window.api.enviarComandoUDP(motor1Torreta);
            await delay(100)
            window.api.enviarComandoUDP(motor2Torreta);
            await delay(100)


            // Esperar 2 segundos

            window.api.enviarComandoUDP(movimientoTorreta);
          }

          ejecutarComandos()
        }
      } else {
        followDrone = false
        updateCameraZoom(1)
        if (estadoMotorArrancado) {
          window.api.enviarComandoUDP(pararMotor1Torreta);
          window.api.enviarComandoUDP(pararMotor2Torreta);

        }
      }
    } else {
      trackingMode = false
      updateCameraZoom()
    }

    if (gamepadLeft.buttons[3]?.touched && gamepadLeft.buttons[3]?.value > 0) {
      zoomingMin = true
      updateCameraZoom()
    }
    if (gamepadLeft.buttons[8]?.touched && gamepadLeft.buttons[8]?.value > 0) {
      zoomingMax = true
      updateCameraZoom()
    }

    if (gamepad.buttons[1]?.pressed && gamepad.buttons[1]?.value > 0) {
      if (!followDrone) {
        trackingMode = false
      }
      zoomLevel = THREE.MathUtils.clamp(zoomLevel + zoomSpeed * delta, minZoom, maxZoom)
      updateCameraZoom()
    }

    if (gamepad.buttons[3]?.pressed && gamepad.buttons[3]?.value > 0) {
      if (!followDrone) {
        trackingMode = false
      }
      zoomLevel = THREE.MathUtils.clamp(zoomLevel - zoomSpeed * delta, minZoom, maxZoom)
      updateCameraZoom()
    }
    if (gamepadRight.buttons[4]?.touched && gamepadRight.buttons[4]?.value > 0) {
      if (config.position[8].ejeX.toFixed(0) != 0 && config.position[9].ejeX.toFixed(0) != 0) {
        secondTracking = true

      }
    }
    if (gamepadRight.buttons[7]?.pressed) {
      returnMomentHome = true
    }

    if (gamepadRight && gamepadRight.buttons) {
      const BUTTON_IDS = [8, 9, 10] // Lista de los botones que están siendo manejados

      BUTTON_IDS.forEach((buttonIndex) => {
        const button = gamepadRight.buttons[buttonIndex]

        if (button) {
          const isButtonPressed = button.pressed
          const holdTimeKey = `buttonHoldTime${buttonIndex}`
          const originalYawKey = `originalYaw${buttonIndex}`
          const originalPitchKey = `originalPitch${buttonIndex}`

          if (isButtonPressed) {
            // Si el botón está presionado
            if (!this[holdTimeKey]) {
              // Guardar el tiempo de inicio y la posición solo la primera vez
              this[holdTimeKey] = performance.now()
              this[originalYawKey] = this.yaw
              this[originalPitchKey] = this.pitch
            }

            const holdDuration = performance.now() - this[holdTimeKey]

            if (holdDuration >= 2000 && !this.cancelarVolverAPosicion) {
              toastr.options = {
                positionClass: 'toast-top-right',
                timeOut: 5000,
                extendedTimeOut: 1000
              }

              toastr.success(`¡Guardando posición actual en posicion ${buttonIndex - 7}!`, 'Éxito')

              // Ajustar la posición de las notificaciones de Toastr
              setTimeout(() => {
                const toast = document.querySelector('.toast')
                if (toast) {
                  toast.style.top = '80px'
                  toast.style.backgroundColor = 'rgba(255,64,0)' // Cambiar el color de fondo
                  toast.style.fontSize = '20px' // Cambiar el color de fondo
                  toast.style.color = '#fff' // Cambiar el color del texto // Ajustar la distancia desde el fondo
                  toast.style.width = '380px'
                }
              }, 100) // Asegúrate de que Toastr ya haya renderizado el toast antes de cambiar el estilo

              if (config?.position?.[buttonIndex]) {
                config.position[buttonIndex].ejeX = this.yaw
                config.position[buttonIndex].ejeY = this.pitch
              }
              this.cancelarVolverAPosicion = true
            }
          } else if (this[holdTimeKey]) {
            // Si el botón se ha soltado después de haber sido presionado
            const holdDuration = performance.now() - this[holdTimeKey]

            if (holdDuration < 3000 && !this.cancelarVolverAPosicion) {
              this.yaw = this[originalYawKey]
              this.pitch = this[originalPitchKey]
              ejex = this.yaw
              ejey = this.pitch

              // Definir retorno de posición para cada botón
              if (buttonIndex == 8) {
                returnMoment8 = true
              }
              if (buttonIndex == 9) {
                returnMoment9 = true
              }
              if (buttonIndex == 10) {
                returnMoment10 = true
              }
            }

            // Reiniciar estado cuando se suelta el botón
            this[holdTimeKey] = null
            this.cancelarVolverAPosicion = false
          }
        }
      })
    } else {
      console.log('No se detectó el gamepad o los botones no están disponibles.')
    }

    if (!followDrone) {
      const lookX = this.applyDeadZone(gamepad.axes[0], config.gamepad.deadZone)
      const lookY = this.applyDeadZone(gamepad.axes[1], config.gamepad.deadZone)

      if (gamepad.buttons[0].touched && gamepadLeft.buttons[0].touched) {
        this.yaw -= (lookX * config.controls.rotationSpeed * delta) / zoomLevel
        this.pitch = THREE.MathUtils.clamp(
          this.pitch - (lookY * config.controls.rotationSpeed * delta) / zoomLevel,
          config.controls.verticalMin,
          config.controls.verticalMax
        )
      }
      // else {
      //   this.yaw -= (lookX * config.controls.rotationSpeed * delta) / zoomLevel
      //   this.pitch = THREE.MathUtils.clamp(
      //     this.pitch - (lookY * config.controls.rotationSpeed * delta) / zoomLevel,
      //     config.controls.verticalMin,
      //     config.controls.verticalMax
      //   )
      // }

      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
    }

    const now = performance.now()
    if (now - lastButtonPressTime < 500) return

    if (gamepad.buttons[4]?.touched) {
      if (marcoIA !== 'naranja') {
        if (boton1pulsado) {
          marcador.activateTarget()
          marcador.update()
          trackingMode = false
          toggleFollowMode()
          boton0pulsado = !boton0pulsado
          lastButtonPressTime = now
        }
      }
      if (marcoIA === 'naranja') {
        // Configuración
        toastr.options = {
          positionClass: 'toast-top-right',
          timeOut: 2000,
          extendedTimeOut: 1000,
          preventDuplicates: true // Evita duplicados (opcional)
        }

        // Mostrar error
        toastr.error(`No se puede fijar el dron`, 'UNABLE TO LOCK')

        // Estilos personalizados (opcional)
        const toast = document.querySelector('.toast')

        // Opcion1

        if (toast) {
          toast.style.top = '80px'
          toast.style.backgroundColor = 'red'
          toast.style.fontSize = '20px'
          toast.style.color = '#fff'
          toast.style.width = '380px'
        }
      }
    }

    if (gamepadRight.buttons[6]?.touched && gamepadRight.buttons[6]?.value > 0) {
      if (!boton5Pulsado) {
        // Cambié el nombre a boton5Pulsado para coincidir con el botón 5
        if (!boton0pulsado) {
          if (!followDrone) {
            trackingMode = false
          }
          trackingFrame.toggle()
          boton1pulsado = !boton1pulsado
          lastButtonPressTime = now
        }
        marcador.activateIA()
        marcador.update()
        boton5Pulsado = true // Marcamos que el botón 5 fue pulsado
      }
    } else {
      boton5Pulsado = false // Resetear cuando el botón ya no está siendo presionado
    }
  }

  applyDeadZone(value, deadZone) {
    if (Math.abs(value) < deadZone) return 0
    return value
  }
}

function updateCameraZoom(num) {
  if (num > 1) {
    const delta = Math.min(clock.getDelta(), 0.1)
    if (zoomLevel < num) {
      zoomLevel = THREE.MathUtils.clamp(zoomLevel + zoomSpeed * delta * 50, minZoom, num)
    } else {
      zoomLevel = THREE.MathUtils.clamp(zoomLevel - zoomSpeed * delta * 50, minZoom, num)
    }
  }
  if (num === 1) {
    const delta = Math.min(clock.getDelta(), 0.1)
    zoomLevel = THREE.MathUtils.clamp(zoomLevel - zoomSpeed * delta * 150, minZoom, maxZoom)
  }

  if (zoomingMax) {
    const delta = Math.min(clock.getDelta(), 0.1)
    zoomLevel = THREE.MathUtils.clamp(zoomLevel + zoomSpeed * delta * 150, minZoom, maxZoom)
    camera.zoom = zoomLevel
    camera.updateProjectionMatrix()

    if (zoomLevel >= maxZoom) {
      zoomingMax = false
    }
  }

  if (zoomingMin) {
    const delta = Math.min(clock.getDelta(), 0.1)
    zoomLevel = THREE.MathUtils.clamp(zoomLevel - zoomSpeed * delta * 150, minZoom, maxZoom)
    camera.zoom = zoomLevel
    camera.updateProjectionMatrix()

    if (zoomLevel <= minZoom) {
      zoomingMin = false
    }
  }
  camera.zoom = zoomLevel
  camera.updateProjectionMatrix()
}

function toggleFollowMode() {
  followDrone = !followDrone
  console.log('Modo seguimiento:', followDrone ? 'ON' : 'OFF')

  if (followDrone) {
    toastr.options = {
      positionClass: 'toast-top-right',
      timeOut: 2000,
      extendedTimeOut: 1000,
      preventDuplicates: true // Evita duplicados (opcional)
    }
    toastr.error(`Dron fijado`, 'LOCKED')
    const toast = document.querySelector('.toast')

    // Opcion1

    if (toast) {
      toast.style.top = '80px'
      toast.style.backgroundColor = 'green'
      toast.style.fontSize = '20px'
      toast.style.color = '#fff'
      toast.style.width = '380px'
    }
    trackingFrame.center()
  } else {
    toastr.options = {
      positionClass: 'toast-top-right',
      timeOut: 2000,
      extendedTimeOut: 1000,
      preventDuplicates: true
    }
    toastr.error(`Dron desfijado`, 'UNLOCKED')
    const toast = document.querySelector('.toast')

    // Opcion1

    if (toast) {
      toast.style.top = '80px'
      toast.style.backgroundColor = '#E5BE01'
      toast.style.fontSize = '20px'
      toast.style.color = '#fff'
      toast.style.width = '380px'
    }
    trackingFrame.isCentered = false
    updateCameraZoom()
  }
}

function init() {
  // Configuración inicial del body
  document.body.style.margin = '0'
  document.body.style.padding = '0'
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'

  // Crear escena Three.js
  scene = new THREE.Scene()
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)

  // Configuración del canvas para que ocupe toda la pantalla
  renderer.domElement.style.position = 'fixed'
  renderer.domElement.style.top = '0'
  renderer.domElement.style.left = '0'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.margin = '0'
  renderer.domElement.style.padding = '0'
  renderer.domElement.style.zIndex = '0'
  renderer.domElement.style.outline = 'none'

  document.body.appendChild(renderer.domElement)

  // Configurar la cámara
  camera = new THREE.PerspectiveCamera(
    config.camera.fov,
    window.innerWidth / window.innerHeight,
    config.camera.near,
    config.camera.far
  )
  camera.position.set(...Object.values(config.camera.position))
  camera.rotateY(-Math.PI / 2)
  camera.zoom = zoomLevel
  camera.add(modeloGroup)
  scene.add(camera)
  const controls = new JoystickControls(camera)
  trackingFrame = new TrackingFrame()
  const info = new DataInfo()
  info.create()
  const distanceInfo = new distanceInformation()
  const zoomIndicator = new ZoomIndicator()
  const cross = new Cross()
  const map = new Map()
  map.console()
  const viewfinder = new Viewfinder()

  new RGBELoader().load('assets/environmentMap/road4k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.background = texture
    scene.environment = texture
  })

  new GLTFLoader().load('assets/models/mavic.glb', (gltf) => {
    const model = gltf.scene
    model.scale.set(0.2, 0.2, 0.2)
    scene.add(model)

    // 1. Verificar si el modelo tiene animaciones
    if (gltf.animations && gltf.animations.length) {
      console.log('Animaciones encontradas:', gltf.animations)

      // 2. Crear un AnimationMixer para el modelo
      mixer = new THREE.AnimationMixer(model)

      // 3. Crear acciones para cada animación
      gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip)
        actions[clip.name].play() // Reproducir automáticamente
      })
    }

    droneInstance = new Drone(model)
  })

  // new GLTFLoader().load('assets/models/mavic.glb', (gltf) => {
  //   const model = gltf.scene
  //   model.scale.set(1, 1, 1)
  //   model.position.set(1, 1, 1)
  //   scene.add(model)
  // })

  new GLTFLoader().load('assets/models/MSP_VAMTAC.glb', (gltf) => {
    const model = gltf.scene
    model.scale.set(10, 10, 10)
    model.position.set(-1, -24, 41.8)
    scene.add(model)
  })

  // Configurar eventos de teclado
  let Rpulsada = false
  let Fpulsada = false

  window.addEventListener('keydown', (e) => {
    const now = performance.now()
    if (now - lastButtonPressTime < 500) return

    if (e.key.toLowerCase() === 'r') {
      if (!Fpulsada) {
        trackingFrame.toggle()
        lastButtonPressTime = now
        Rpulsada = !Rpulsada
      }
    }
    if (e.key.toLowerCase() === 'f') {
      if (Rpulsada) {
        toggleFollowMode()
        Fpulsada = !Fpulsada
        lastButtonPressTime = now
      }
    }
    if (e.key.toLowerCase() === 'q') {
      history.back()
    }
  })

  // Manejar redimensionamiento
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })
  function toNormalizedDegreesY(radians) {
    let degrees = radians * Math.abs(180 / Math.PI)
    while (degrees > 360) {
      degrees -= 360
    }
    return degrees.toFixed(1)
  }
  function toNormalizedDegrees(radians) {
    let degrees = radians * Math.abs(180 / Math.PI)
    while (degrees > 360) {
      degrees -= 360
    }
    while (degrees < 0) {
      degrees += 360
    }
    return degrees.toFixed(1)
  }
  // Función de animación
  function animate() {
    requestAnimationFrame(animate)
    const delta = Math.min(clock.getDelta(), 0.1)
    ajustarPos(config.position)
    info.update(toNormalizedDegrees(ejex), toNormalizedDegreesY(ejey))
    controls.update(delta)
    ajustarPos(config.position)
    zoomIndicator.update(zoomLevel)
    viewfinder.updateAngle(180 - 60 / zoomLevel, toNormalizedDegrees(ejex))
    if (droneInstance) {
      droneInstance.update()
      if (mixer) {
        mixer.update(delta)
      }

      if (followDrone) {
        camera.lookAt(droneInstance.position)
        controls.updateJoystick(camera)
        distanceInfo.update(targetDistance)
        cross.update()
      }
      if (!followDrone) {
        distanceInfo.update('---------')
        cross.update()
      }
      if (returnMoment8) {
        controls.goPosition(config.position[8].ejeX, config.position[8].ejeY)
      }
      if (returnMoment9) {
        controls.goPosition(config.position[9].ejeX, config.position[9].ejeY)
      }
      if (returnMoment10) {
        controls.goPosition(config.position[10].ejeX, config.position[10].ejeY)
      }
      if (returnMomentHome) {
        controls.goPosition(config.position.home.ejeX, config.position.home.ejeY)
      }
      if (showTrackingFrame) {
        trackingFrame.update(droneInstance.position, camera)
      }
      if (trackingMode) {
        controls.increaseAngles(30)
        zoomingMax = false
        zoomingMin = false
      }
      if (secondTracking && now <= max) {
        const yawDeg = ((controls.yaw * 180) / Math.PI).toFixed(2)
        const pitchDeg = ((controls.pitch * 180) / Math.PI).toFixed(2)
        const pos8Deg = ((config.position[8].ejeX * 180) / Math.PI).toFixed(2)
        const pos9Deg = ((config.position[9].ejeX * 180) / Math.PI).toFixed(2)
        const nowDeg = ((now * 180) / Math.PI).toFixed(2)

        if (!phase) {
          // Fase 1: Movimiento hacia posición 8
          if (Math.abs(yawDeg - pos8Deg) > 1.0) {
            controls.goPosition(config.position[8].ejeX, now, zoomLevel)
          } else if (Math.abs(pitchDeg - nowDeg) <= 1.0) {
            // Cambia a fase 2 cuando llega a posición 8
            phase = true

            // Lógica de subida/bajada
            if (!top) {
              now = Math.min(now + 0.1, max)
              if (now >= max) top = true
            } else {
              now = Math.max(now - 0.1, 0)
              if (now <= 0) top = false
            }
          }
        } else {
          // Fase 2: Movimiento hacia posición 9
          if (Math.abs(yawDeg - pos9Deg) > 1.0) {
            controls.goPosition(config.position[9].ejeX, now, zoomLevel)
          } else if (Math.abs(pitchDeg - nowDeg) <= 1.0) {
            // Cambia a fase 1 cuando llega a posición 9
            phase = false

            // Lógica de subida/bajada (alterna durante el descenso)
            if (top) {
              now = Math.max(now - 0.1, 0)
              if (now <= 0) top = false
            } else {
              now = Math.min(now + 0.1, max)
              if (now >= max) top = true
            }
          }
        }
      }
    }
    // console.log('distance', targetDistance)
    map.update()

    renderer.render(scene, camera)
  }

  animate()
}
document.addEventListener('DOMContentLoaded', init)
