import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader'

// === Escena del HUD (dron) ===
const dronScene = new THREE.Scene()
const hudCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
hudCamera.position.z = 3
let mixer

// === Renderer del HUD ===
const dronRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
dronRenderer.setSize(window.innerWidth / 4.5, window.innerHeight / 4)
dronRenderer.setPixelRatio(window.devicePixelRatio)

// Añadir el canvas al div
const dronContainer = document.getElementById('dron-container')
dronContainer.appendChild(dronRenderer.domElement)

// === Luz para el modelo del dron ===
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(1, 1, 1)
dronScene.add(light)

// === Cargar el dron ===
const loader = new GLTFLoader()
let dronModel

loader.load('assets/models/mavic.glb', (gltf) => {
  dronModel = gltf.scene
  dronModel.scale.set(0.3, 0.3, 0.3)
  dronModel.rotation.z = -Math.PI / 7
  dronModel.rotation.y = -Math.PI / 3
  mixer = new THREE.AnimationMixer(dronModel)

  // Añadir las animaciones del modelo
  gltf.animations.forEach((clip) => {
    mixer.clipAction(clip).play() // Reproducir cada animación
  })
  dronScene.add(dronModel)
})
new RGBELoader().load('assets/environmentMap/sky_1k.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping
  //   dronScene.background = texture
  dronScene.environment = texture
})
// === Evento para alternar visibilidad ===
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'd' && dronModel) {
    dronModel.visible = !dronModel.visible
  }
})

// === Animación de la escena del HUD ===
function animate() {
  requestAnimationFrame(animate)

  // (Opcional) rotar el dron para efecto visual
  if (dronModel) {
    // dronModel.rotation.y += 0.005
    if (mixer) {
      mixer.update(0.01) // Actualiza el mixer con el delta de tiempo
    }
  }

  dronRenderer.render(dronScene, hudCamera)
}

animate()
