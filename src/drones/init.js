import {
  Vector3,
  Clock,
  Raycaster
} from 'three'
import { scene, camera, loops } from '../index'
import PubSub from '../events'
import { triggerExplosion } from '../particles'

let droneFactory = {
  ready: false
}

const initDroneFactory = (msg, data) => {
  droneFactory = () => {
    const drone = data.mesh.clone()
    drone.up.set(0, 0, 1)
    drone.rotation.x = 0
    drone.scale.set(0.1, 0.1, 0.1)
    drone.name = `drone-${drone.id}`
    return drone
  }
  droneFactory.ready = true
  PubSub.publish('x.drones.factory.ready')
}
PubSub.subscribe('x.assets.drone.loaded', initDroneFactory)

const buildPilotDrone = () => {
  const pilotDrone = droneFactory()
  pilotDrone.gunClock = new Clock(false)
  pilotDrone.userData.altitude = NaN
  pilotDrone.userData.speed = 0
  pilotDrone.userData.lastPosition = pilotDrone.position.clone()
  pilotDrone.layers.enable(1)
  scene.add(pilotDrone)
  window.pilotDrone = pilotDrone
  let localY
  let targetPosition
  let targetPositionFinal
  let camVec = new Vector3()
  const raycaster = new Raycaster()
  const downVector = new Vector3(0, 0, -1)
  const offsetVector = new Vector3(0, 0, 100)
  let terrainTiles
  let lastTimestamp = 0
  const pilotDroneLoop = (timestamp, delta) => {
    camVec = camera.getWorldDirection(camVec)
    targetPosition = camera.position.clone()
      .add(camVec.multiplyScalar(20))
    localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    targetPositionFinal = targetPosition.sub(localY.multiplyScalar(8))
    pilotDrone.position.copy(targetPositionFinal)
    pilotDrone.lookAt(targetPosition
      .add(camVec)
      .add({ x: 0, y: 0, z: 60 })
    )

    // velocity computation
    pilotDrone.userData.velocity = pilotDrone.position.clone()
      .sub(pilotDrone.userData.lastPosition)
      .multiplyScalar(1000 / delta)
    pilotDrone.userData.speed = pilotDrone.userData.velocity.length()
    pilotDrone.userData.lastPosition.copy(pilotDrone.position)

    // altitude computation
    if (timestamp - lastTimestamp > 200) {
      lastTimestamp = timestamp
      raycaster.set(pilotDrone.position.clone().add(offsetVector), downVector)
      terrainTiles = raycaster.intersectObjects(
        camera.userData.terrainTileUnder && camera.userData.terrainTileUnder.geometry ? [camera.userData.terrainTileUnder] : []
      )
      if (terrainTiles.length > 0) {
        pilotDrone.userData.altitude = terrainTiles[0].distance - offsetVector.length()
        pilotDrone.userData.groundNormal = terrainTiles[0].face.normal
      } else {
        pilotDrone.userData.altitude = NaN
      }
      if (pilotDrone.userData.altitude < 5) {
        PubSub.publish('x.drones.explode.pilotDrone', pilotDrone)
        PubSub.publish('x.drones.collision.terrain.pilotDrone', pilotDrone.userData.groundNormal)
      }
    }
  }
  loops.push(pilotDroneLoop)
  PubSub.publish('x.drones.pilotDrone.loaded', { pilotDrone })
}
PubSub.subscribe('x.drones.factory.ready', buildPilotDrone)

const spawnDrone = (circle = true, phase = 0) => {
  const drone = droneFactory()
  drone.lockClock = new Clock(false)
  drone.userData.life = 100
  scene.add(drone)
  drone.lastPosition = drone.position.clone()
  const camVec = new Vector3()
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
    if (!drone.destroyed && drone.userData.life <= 50 && !drone.smoking) {
      PubSub.publish('x.drones.smoke.start', drone)
    }
    if (!drone.destroyed && drone.userData.life <= 0) {
      PubSub.publish('x.drones.destroy', drone)
      drone.destroyed = true
      triggerExplosion(drone)
    }
  }
  PubSub.subscribe('x.drones.destroy', (msg, deadDrone) => {
    if (deadDrone.id === drone.id) {
      PubSub.publish('x.loops.remove', droneLoop)
    }
  })
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
