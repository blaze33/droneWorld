import {
  DirectionalLight,
  HemisphereLight,
  AmbientLight
} from 'three'
import { drone } from './index'

const dirLight = new DirectionalLight(0xffffff, 4)
window.dirLight = dirLight
const hemishpereLight = new HemisphereLight(0xffffbb, 0x080820, 0.1)
hemishpereLight.position.set(0, 0, 1)
hemishpereLight.up.set(0, 0, 1)
hemishpereLight.needsUpdate = true
const ambientLight = new AmbientLight(0x404040, 2.5) // soft white light

const updateDirLightPosition = () => {
  dirLight.position.copy(dirLight.sunPosition)
  dirLight.position.normalize()
  dirLight.position.multiplyScalar(1600.0)
  dirLight.position.add(drone.position)
}

const initLights = (scene, sunPosition) => {
  dirLight.sunPosition = sunPosition
  dirLight.updatePosition = updateDirLightPosition
  dirLight.updatePosition()
  dirLight.up.set(0, 0, 1)
  dirLight.name = 'sunlight'

  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 1024
  const d = 1024
  dirLight.shadow.camera.left = -d
  dirLight.shadow.camera.right = d
  dirLight.shadow.camera.top = d
  dirLight.shadow.camera.bottom = -d

  dirLight.shadow.camera.far = 3200
  dirLight.shadow.bias = -0.0001
  dirLight.needsUpdate = true

  scene.add(dirLight)
  scene.add(hemishpereLight)
  scene.add(ambientLight)
}

export { initLights, dirLight, hemishpereLight, ambientLight }
