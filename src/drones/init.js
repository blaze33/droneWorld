import {
  Vector3,
  Clock
} from 'three'
import {scene, camera, loops} from '../index'
import PubSub from '../events'
import {triggerExplosion} from '../particles'

let droneFactory = {
  ready: false
}

const droneController = {
  x: 0,
  y: 0,
  z: 0
}

const initDroneGui = (gui) => {
  window.droneController = droneController
  const droneFolder = gui.addFolder('drone')
  droneFolder.add(droneController, 'x', 0, 2 * Math.PI)
  droneFolder.add(droneController, 'y', 0, 2 * Math.PI)
  droneFolder.add(droneController, 'z', 0, 2 * Math.PI)
}
PubSub.subscribe('x.gui.init', (msg, data) => initDroneGui(data.gui))

const initDroneFactory = (msg, data) => {
  droneFactory = () => {
    const drone = data.mesh.clone()
    drone.up.set(0, 0, 1)
    drone.rotation.x = 0
    drone.scale.set(0.1, 0.1, 0.1)
    return drone
  }
  droneFactory.ready = true
  PubSub.publish('x.drones.factory.ready')
}
PubSub.subscribe('x.assets.drone.loaded', initDroneFactory)

const buildPilotDrone = () => {
  const pilotDrone = droneFactory()
  pilotDrone.gunClock = new Clock(false)
  scene.add(pilotDrone)
  let localY
  let targetPosition
  let targetPositionFinal
  let camVec = new Vector3()
  const pilotDroneLoop = () => {
    camVec = camera.getWorldDirection(camVec)
    targetPosition = camera.position.clone()
      .add(camVec.multiplyScalar(20))
    localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    targetPositionFinal = targetPosition.sub(localY.multiplyScalar(8))
    pilotDrone.position.copy(targetPositionFinal)
    pilotDrone.lookAt(targetPosition
      .add(camVec)
      .add({x: 0, y: 0, z: 60})
    )
    pilotDrone.rotation.x += droneController.x
    pilotDrone.rotation.y += droneController.y
    pilotDrone.rotation.z += droneController.z
  }
  loops.push(pilotDroneLoop)
  PubSub.publish('x.drones.pilotDrone.loaded', {pilotDrone})
}
PubSub.subscribe('x.drones.factory.ready', buildPilotDrone)

const spawnDrone = (circle = true, phase = 0) => {
  const drone = droneFactory()
  drone.lockClock = new Clock(false)
  drone.userData.life = 100
  scene.add(drone)
  drone.lastPosition = drone.position.clone()
  let camVec = new Vector3()
  const droneLoop = (timestamp, delta) => {
    if (!drone) return
    const radius = 300
    if (circle) {
      drone.position.set(
        radius * Math.cos(timestamp / 1000 / 3 + phase),
        radius * Math.sin(timestamp / 1000 / 3 + phase),
        300 + 50 * Math.cos(timestamp / 1000 + phase)
      )
    } else {
      drone.position.copy(camera.position.clone()
        .add(camera.getWorldDirection(camVec).multiplyScalar(100)))
    }
    drone.velocity = drone.position.clone().sub(drone.lastPosition).multiplyScalar(1000 / delta)
    drone.lastPosition = drone.position.clone()
    if (!drone.destroyed && drone.userData.life <= 50) {
      PubSub.publish('x.drones.smoke.start', drone)
    }
    if (!drone.destroyed && drone.userData.life <= 0) {
      PubSub.publish('x.drones.destroy', drone)
      drone.destroyed = true
      triggerExplosion(drone)
    }
  }
  PubSub.publish('x.hud.register.target', drone)
  loops.push(droneLoop)
}

const initTargets = () => {
  spawnDrone(true)
  spawnDrone(true, Math.PI / 8)
  spawnDrone(true, Math.PI / 4)
  spawnDrone(true, Math.PI / 2)
  spawnDrone(true, Math.PI)
}
PubSub.subscribe('x.drones.factory.ready', initTargets)
PubSub.subscribe('x.drones.destroy', () => spawnDrone(true, Math.random() * 2 * Math.PI))

export default initDroneFactory
