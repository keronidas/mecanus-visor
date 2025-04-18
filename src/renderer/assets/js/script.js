import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Naranja: rgba(255,64,0)

const config = {
  camera: {
    fov: 75,
    near: 0.1,
    far: 3000,
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
  }
}
let scene, renderer, camera
let droneInstance, trackingFrame
let followDrone = false
let showTrackingFrame = false
const clock = new THREE.Clock()
let lastButtonPressTime = 0
let boton0pulsado = false
let boton1pulsado = false
let trackingMode = false
let zoomLevel = 1
const zoomSpeed = 2
const minZoom = 1
const maxZoom = 8
let ejex = ''
let ejey = ''
let anguloDronCamaraX = 0
let anguloDronCamaraY = 0
let targetDistance = '---------'
document.documentElement.style.setProperty('--zoomLevel', zoomLevel)

class Map {
  constructor(initialZoom = 12) {
    this.zoomLevel = initialZoom
    this.zoomMapSpeed = 1
    this.minZoomMap = 6
    this.maxZoomMap = 16
    this.targetCoords = [40.469519, -3.615917]

    this.initContainer()
    this.initMap()
    this.setupKeyboardControls()
  }

  initContainer() {
    this.element = document.createElement('div')
    this.element.id = 'map'
    this.element.style.cssText = `
      width: 260px; 
      clip-path: polygon(100% 100%, 100% 0%, 40% 0%, 0% 100%);
      height: 145px; 
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

  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return

      switch (e.key.toLowerCase()) {
        case 'i':
          this.setZoom(this.zoomLevel + this.zoomMapSpeed)
          break
        case 'k':
          this.setZoom(this.zoomLevel - this.zoomMapSpeed)
          break
      }
    })
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
class InfoAngle {
  constructor() {
    this.infoAngle = document.createElement('div')
    this.initStyles()
    document.body.appendChild(this.infoAngle)
  }
  initStyles() {
    this.infoAngle.style.cssText = `
  position: absolute;
  top: 0%;
  margin-bottom: 200px;
  left: 50%;
  font-size: 40px;
  z-index: 30;
`
  }
}

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
    this.container.appendChild(this.circle)
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
    this.horizontalAxes.innerText = ejeX
    this.verticalAxes.innerText = ejeY
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
    this.distance.textContent = `TRG: ${targetDistance}`
    this.positionEarthX.textContent = `3º36'57" W`
    this.positionEarthY.textContent = `40º28'08" N`
  }
  update(msg) {
    this.distance.textContent = `TRG: ${msg}`
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
    this.element.textContent = ` x${zoomLevel.toFixed(1)}`
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
    const newPositionH = 20 - (1 - zoomLevel) * 22.5
    const newPositionV = 20 - (1 - zoomLevel) * 40

    this.horizontalLineRight.style.left = `${newPositionV}px`
    this.horizontalLineLeft.style.left = `${-20 - newPositionV}px`
    this.verticalLineBot.style.top = `${newPositionH}px`
    this.verticalLineTop.style.top = `${-20 - newPositionH}px`
  }

  createCross() {
    this.element.appendChild(this.horizontalLineRight)
    this.element.appendChild(this.verticalLineBot)
    this.element.appendChild(this.horizontalLineLeft)
    this.element.appendChild(this.verticalLineTop)
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
      border: 5px solid rgba(255, 0, 0, 1);
      pointer-events: none;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px rgba(255, 0,0 , 1);
      z-index: 2;
      visibility: hidden;
    `
  }

  update(position, camera) {
    const projected = position.clone().project(camera)
    const isBehindCamera = projected.z > 1
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth
    const y = (-(projected.y * 0.5) + 0.5) * window.innerHeight

    if (
      x > window.innerWidth / 2 - 300 &&
      x < window.innerWidth / 2 + 400 &&
      y > window.innerHeight / 2 - 275 &&
      y < window.innerHeight / 2 + 275
    ) {
      this.element.style.border = `5px solid rgba(0, 143, 57)`
      this.element.style.boxShadow = `0 0 10px  rgba(0, 143, 57, 0.8)`
      if (trackingMode) {
        followDrone = true
      }
    } else {
      followDrone = false
      this.element.style.border = `5px solid rgba(255, 0, 0)`
      this.element.style.boxShadow = `0 0 10px  rgba(255, 0, 0, 0.8)`
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
    if (followDrone) {
      this.element.style.borderColor = 'rgba(0, 143, 57)'
      this.element.style.boxShadow = '0 0 10px  rgba(0, 143, 57, 0.8)'
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
    this.position.z = config.drone.orbitRadius * Math.sin(this.angle * 0.7) + 1000
    this.position.y = config.drone.height + Math.sin(this.angle * 2) * config.drone.bobAmount + 600
    let angleInRadiansX = -Math.atan2(this.position.z, this.position.x) + Math.PI + Math.PI / 2
    let angleInRadiansY = Math.atan2(this.position.y, this.position.z)
    targetDistance = ` ${Math.sqrt(this.position.x * this.position.x + this.position.y * this.position.y + this.position.z * this.position.z).toFixed(1)}m`
    anguloDronCamaraX = angleInRadiansX
    anguloDronCamaraY = angleInRadiansY
    this.model.position.copy(this.position)
    this.model.rotation.set(0, this.angle, Math.sin(this.angle) * 0.2)
  }

  update() {
    this.updatePosition()
  }
}
class JoystickControls {
  constructor(camera) {
    this.camera = camera
    this.yaw = -Math.PI / 2
    this.pitch = 0
    this.gamepad = null
    ejex = this.yaw

    this.setupEventListeners()
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

      if (droneInstance) {
      }
    }
  }

  setupEventListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepad = e.gamepad
      console.log('Joystick conectado:', e.gamepad.id)
    })
  }
  updateJoystick() {
    this.yaw = anguloDronCamaraX
    this.pitch = anguloDronCamaraY
  }
  update(delta) {
    ejey = this.pitch
    ejex = this.yaw
    if (!this.gamepad) return
    const gamepad = navigator.getGamepads()[this.gamepad.index]
    if (!gamepad) return

    if (gamepad.buttons[3]?.touched && gamepad.buttons[3]?.value > 0) {
      trackingMode = true

      if (trackingMode) {
        zoomLevel = 3
        updateCameraZoom()
      } else {
        followDrone = false
        zoomLevel = 1
        updateCameraZoom()
      }
    }

    // Control de zoom cuando followDrone está activo
    if (gamepad.buttons[2]?.pressed && gamepad.buttons[2]?.value > 0) {
      if (!followDrone) {
        trackingMode = false
      }
      zoomLevel = THREE.MathUtils.clamp(zoomLevel + zoomSpeed * delta, minZoom, maxZoom)
      updateCameraZoom()
    }

    if (gamepad.buttons[4]?.pressed && gamepad.buttons[4]?.value > 0) {
      if (!followDrone) {
        trackingMode = false
      }
      zoomLevel = THREE.MathUtils.clamp(zoomLevel - zoomSpeed * delta, minZoom, maxZoom)
      updateCameraZoom()
    }

    if (!followDrone) {
      const lookX = this.applyDeadZone(gamepad.axes[0], config.gamepad.deadZone)
      const lookY = this.applyDeadZone(gamepad.axes[1], config.gamepad.deadZone)

      this.yaw -= lookX * config.controls.rotationSpeed * delta
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - lookY * config.controls.rotationSpeed * delta,
        config.controls.verticalMin,
        config.controls.verticalMax
      )

      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
    }

    const now = performance.now()
    if (now - lastButtonPressTime < 500) return

    if (gamepad.buttons[0]?.pressed) {
      if (boton1pulsado) {
        trackingMode = false

        toggleFollowMode()
        boton0pulsado = !boton0pulsado
        lastButtonPressTime = now
      }
    }

    if (gamepad.buttons[1]?.pressed) {
      if (!boton0pulsado) {
        if (!followDrone) {
          trackingMode = false
        }
        trackingFrame.toggle()
        boton1pulsado = !boton1pulsado
        lastButtonPressTime = now
      }
    }
  }

  applyDeadZone(value, deadZone) {
    if (Math.abs(value) < deadZone) return 0
    return value
  }
}

function updateCameraZoom() {
  camera.zoom = zoomLevel
  camera.updateProjectionMatrix()
}

function toggleFollowMode() {
  followDrone = !followDrone
  console.log('Modo seguimiento:', followDrone ? 'ON' : 'OFF')

  if (followDrone) {
    trackingFrame.center()
  } else {
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

  const controls = new JoystickControls(camera)
  trackingFrame = new TrackingFrame()
  const info = new DataInfo()
  info.create()
  const distanceInfo = new distanceInformation()
  const zoomIndicator = new ZoomIndicator()
  const cross = new Cross()
  const map = new Map()
  const viewfinder = new Viewfinder()

  new RGBELoader().load('assets/environmentMap/road4k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.background = texture
    scene.environment = texture
  })

  new GLTFLoader().load('assets/models/dron.glb', (gltf) => {
    const model = gltf.scene
    model.scale.set(1, 1, 1)
    scene.add(model)
    droneInstance = new Drone(model)
  })

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
    info.update(toNormalizedDegrees(ejex), toNormalizedDegreesY(ejey))
    controls.update(delta)
    zoomIndicator.update(zoomLevel)
    viewfinder.updateAngle(20 * zoomLevel + 100, toNormalizedDegrees(ejex))
    if (droneInstance) {
      droneInstance.update()

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

      if (showTrackingFrame) {
        trackingFrame.update(droneInstance.position, camera)
      }
      if (trackingMode) {
        controls.increaseAngles(30)
      }
    }

    renderer.render(scene, camera)
  }

  animate()
}

document.addEventListener('DOMContentLoaded', init)
