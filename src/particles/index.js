import SPE from 'shader-particle-engine/build/SPE'
import {
  TextureLoader,
  Vector2,
  AdditiveBlending,
  NormalBlending,
  Vector3,
  Color,
  Line3
} from 'three'
import PubSub from '../events'
// import {scene} from '../index'
import { hudData, selectNearestGunTarget } from '../hud'
import { camera } from '../index'

// GROUPS
const textureLoader = new TextureLoader()
const fireGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/Explosion_002_Tile_8x8_256x256.png')),
    frames: new Vector2(8, 8),
    // value: textureLoader.load(require('../textures/sprite-explosion2.png')),
    // frames: new Vector2(5, 5),
    loop: 1
  },
  depthTest: true,
  depthWrite: false,
  blending: AdditiveBlending,
  scale: 600,
  maxParticleCount: 25000
}
const pointsGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/smokeparticle.png'))
  },
  depthTest: true,
  depthWrite: false,
  blending: NormalBlending,
  maxParticleCount: 25000
}
const debrisGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/spark.png'))
  },
  depthTest: true,
  depthWrite: false,
  blending: NormalBlending,
  maxParticleCount: 25000
}
const bulletGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/bullet.png'))
  },
  depthTest: true,
  depthWrite: false,
  blending: NormalBlending,
  maxParticleCount: 25000
}

// EMITTERS
const shockwaveOptions = {
  particleCount: 200,
  type: SPE.distributions.DISC,
  position: {
    radius: 5,
    spread: new Vector3(5)
  },
  maxAge: {
    value: 2,
    spread: 0
  },
  duration: 1,
  activeMultiplier: 2000,

  velocity: {
    value: new Vector3(40)
  },
  rotation: {
    axis: new Vector3(0, 0, 1),
    angle: Math.PI * 0.5,
    static: true
  },
  size: { value: 2 },
  color: {
    value: [
      new Color(0.4, 0.2, 0.1),
      new Color(0.2, 0.2, 0.2)
    ]
  },
  opacity: { value: [0.5, 0.2, 0] }
}
const debrisOptions = {
  particleCount: 100,
  type: SPE.distributions.SPHERE,
  position: {
    radius: 0.1
  },
  maxAge: {
    value: 2
  },
  duration: 1,
  activeMultiplier: 40,
  velocity: {
    value: new Vector3(100)
  },
  acceleration: {
    value: new Vector3(0, 0, -20),
    distribution: SPE.distributions.BOX
  },
  wiggle: 3,
  size: {
    value: 2,
    spread: 5
  },
  angle: {
    spread: Math.PI * 2
  },
  drag: {
    value: 1
  },
  color: {
    value: [
      new Color(1, 1, 1),
      new Color(1, 1, 0),
      new Color(1, 0, 0),
      new Color(0.4, 0.2, 0.1)
    ]
  },
  opacity: { value: [1, 1, 0] }
}
const fireOptions = {
  particleCount: 20,
  type: SPE.distributions.SPHERE,
  position: {
    radius: 5
  },
  maxAge: { value: 2 },
  duration: 1,
  activeMultiplier: 20,
  velocity: {
    value: new Vector3(10)
  },
  size: { value: [20, 100] },
  color: {
    value: [
      new Color(0.5, 0.1, 0.05),
      new Color(0.2, 0.2, 0.2)
    ]
  },
  opacity: { value: [0.5, 0.35, 0.1, 0] }
}
const mistOptions = {
  particleCount: 100,
  position: {
    spread: new Vector3(15, 15, 15),
    distribution: SPE.distributions.SPHERE
  },
  maxAge: { value: 2 },
  duration: 1,
  activeMultiplier: 2000,
  velocity: {
    value: new Vector3(8, 3, 10),
    distribution: SPE.distributions.SPHERE
  },
  size: { value: 40 },
  color: {
    value: new Color(0.2, 0.2, 0.2)
  },
  opacity: { value: [0, 0, 0.4, 0] }
}
const flashOptions = {
  duration: 1,
  particleCount: 50,
  position: { spread: new Vector3(5, 5, 5) },
  velocity: {
    spread: new Vector3(30),
    distribution: SPE.distributions.SPHERE
  },
  size: { value: [40, 20, 20, 20] },
  maxAge: { value: 2 },
  activeMultiplier: 2000,
  // opacity: { value: [0.5, 0.25, 0, 0] }
  opacity: { value: [1, 1, 0, 0] }
  // opacity: { value: 1 }
}

const smokeOptions = {
  particleCount: 1000,
  position: {
    spread: new Vector3(1, 1, 1)
  },
  maxAge: { value: 10 },
  // activeMultiplier: 2000,
  velocity: {
    value: new Vector3(4, 2, 5),
    distribution: SPE.distributions.SPHERE
  },
  size: { value: [20, 60] },
  color: {
    value: new Color(0.9, 0.9, 0.9)
  },
  opacity: { value: [0.4, 0.4, 0.4, 0] }
}

const smokeLightOptions = {
  particleCount: 1000,
  position: {
    spread: new Vector3(1, 1, 1)
  },
  maxAge: { value: 5 },
  // activeMultiplier: 2000,
  velocity: {
    value: new Vector3(4, 2, 5),
    distribution: SPE.distributions.SPHERE
  },
  size: { value: [5, 10] },
  color: {
    value: new Color(1, 1, 1)
  },
  opacity: { value: [0.4, 0.4, 0.4, 0] }
}

const bulletOptions = {
  particleCount: 35,
  type: SPE.distributions.BOX,
  position: {
    radius: 0.1
  },
  maxAge: {
    value: 1
  },
  duration: null,
  activeMultiplier: 1,
  velocity: {
    value: new Vector3(100),
    spread: new Vector3(20, 20, 20)
  },
  acceleration: {
    value: 0
  },
  size: {
    value: 1
  },
  color: {
    value: [
      new Color(1, 1, 1),
      new Color(1, 1, 0)
    ]
  },
  opacity: { value: 1 }
}

const sparkOptions = {
  particleCount: 10,
  type: SPE.distributions.SPHERE,
  position: {
    radius: 0.1
  },
  maxAge: {
    value: 0.3
  },
  duration: 0.3,
  activeMultiplier: 1000,
  velocity: {
    value: new Vector3(100)
  },
  acceleration: {
    value: 0
  },
  wiggle: 30,
  size: {
    value: [3, 1, 0.5]
  },
  color: {
    value: [
      new Color(1, 1, 1),
      new Color(1, 1, 0)
    ]
  },
  opacity: { value: 1 }
}

const flashGroup = new SPE.Group(fireGroupOptions)
const fireGroup = new SPE.Group(fireGroupOptions)

const debrisGroup = new SPE.Group(debrisGroupOptions)
const shockGroup = new SPE.Group(pointsGroupOptions)
const mistGroup = new SPE.Group(pointsGroupOptions)
const smokeGroup = new SPE.Group(pointsGroupOptions)
const smokeLightGroup = new SPE.Group(pointsGroupOptions)

const bulletGroup = new SPE.Group(bulletGroupOptions)
const sparkGroup = new SPE.Group(debrisGroupOptions)

const poolSize = 25
const createNew = false

flashGroup.addPool(poolSize, flashOptions, createNew)
fireGroup.addPool(poolSize, fireOptions, createNew)

debrisGroup.addPool(poolSize, debrisOptions, createNew)
shockGroup.addPool(poolSize, shockwaveOptions, createNew)
mistGroup.addPool(poolSize, mistOptions, createNew)
smokeGroup.addPool(poolSize, smokeOptions, createNew)
smokeLightGroup.addPool(poolSize, smokeLightOptions, createNew)

bulletGroup.addPool(poolSize, bulletOptions, createNew)
sparkGroup.addPool(poolSize, sparkOptions, createNew)

const groups = [
  flashGroup,
  fireGroup,
  debrisGroup,
  shockGroup,
  mistGroup,
  smokeGroup,
  smokeLightGroup,
  bulletGroup,
  sparkGroup
]
// avoid artifacts with the ocean
groups.forEach(group => { group.mesh.renderOrder = 2 })
smokeGroup.mesh.renderOrder = 1
// cf. https://github.com/squarefeet/ShaderParticleEngine/issues/126
groups.forEach(group => { group.mesh.frustumCulled = false })

window.smokeGroup = smokeGroup

const camVec = new Vector3()

const triggerSingleEmitter = (group, target, follow = false, velocityFunction, offset = false) => {
  const emitter = group.getFromPool()

  if (emitter === null) {
    console.log('SPE.Group pool ran out.')
    return
  }

  if (offset) {
    emitter.position.value = target.position.clone().add(
      camera.getWorldDirection(camVec).multiplyScalar(5)
    )
  } else {
    emitter.position.value = target.position.clone()
  }
  if (velocityFunction) {
    emitter.velocity.value = velocityFunction()
  }

  let initialPositions
  // paramsArray vec4( alive, age, maxAge, wiggle )
  let params
  let velocities
  let positions
  let collisions
  let bulletLine
  let closestDistance
  const targetVec3 = new Vector3()
  const chunkReducer = (chunkSize) =>
    (ar, it, i) => {
      const ix = Math.floor(i / chunkSize)
      if (!ar[ix]) ar[ix] = []
      ar[ix].push(it)
      return ar
    }
  const loop = {
    loop: (timestamp, delta) => {
      if (offset) {
        emitter.position.value = target.position.clone().add(
          camera.getWorldDirection(camVec).multiplyScalar(5)
        )
      } else {
        emitter.position.value = target.position.clone()
      }
      if (velocityFunction) {
        emitter.velocity.value = velocityFunction()
        initialPositions = emitter.attributes.position.typedArray.array.slice(
          emitter.attributeOffset * 3,
          (emitter.activationEnd) * 3
        ).reduce(chunkReducer(3), [])
        velocities = emitter.attributes.velocity.typedArray.array.slice(
          emitter.attributeOffset * 3,
          (emitter.activationEnd) * 3
        ).reduce(chunkReducer(3), [])
        params = emitter.paramsArray.slice(
          emitter.attributeOffset * 4,
          (emitter.activationEnd) * 4
        ).reduce(chunkReducer(4), [])
        positions = params.map((param, i) => {
          return param[0]
            ? new Vector3(...initialPositions[i]).add(
              new Vector3(...velocities[i]).multiplyScalar(param[1])
            )
            : null
        })
        collisions = []
        positions.forEach((pos, i) => {
          if (pos === null) return
          hudData.targetsInFront.forEach((target) => {
            bulletLine = new Line3(
              pos,
              pos.clone().add(new Vector3(...velocities[i]).multiplyScalar(delta / 1000))
            )
            closestDistance = bulletLine.closestPointToPoint(target.position, true, targetVec3).sub(target.position).length()
            if (closestDistance < 10) {
              collisions.push([target, pos])
            }
          })
        })
        if (collisions.length) {
          collisions.forEach(ar => {
            PubSub.publish('x.sound.impact', ar[0])
            triggerSmallExplosion({ position: ar[1] })
            ar[0].userData.life -= 5
          })
        }
      }
    },
    alive: true,
    id: target.id
  }
  if (follow && !target.destroyed) {
    PubSub.publish('x.loops.push', loop)
    PubSub.subscribe('x.drones.destroy', (msg, drone) => {
      if (drone.id !== target.id) return
      loop.alive = false
      emitter.disable()
      group.releaseIntoPool(emitter)
    })
  }

  emitter.loop = loop
  emitter.enable()

  if (emitter.duration) {
    setTimeout(() => {
      emitter.disable()
      if (follow) { loop.alive = false }
      group.releaseIntoPool(emitter)
    }, (emitter.duration + emitter.maxAge.value + emitter.maxAge.spread) * 1000)
  }

  return emitter
}

const triggerExplosion = (target) => {
  triggerSingleEmitter(flashGroup, target)
  triggerSingleEmitter(fireGroup, target)
  triggerSingleEmitter(debrisGroup, target)
  triggerSingleEmitter(mistGroup, target)
}
PubSub.subscribe('x.drones.explode', (msg, drone) => triggerExplosion(drone))

const triggerSmoke = (target) => {
  if (target.smoking) return
  target.smoking = true
  triggerSingleEmitter(smokeGroup, target, true)
}
PubSub.subscribe('x.drones.smoke.start', (msg, drone) => triggerSmoke(drone))

const triggerLightSmoke = (target) => {
  if (target.smoking) return
  target.smoking = true
  const smokeEmitter = triggerSingleEmitter(smokeLightGroup, target, true)
  PubSub.subscribe('x.drones.missile.stop', (msg, missile) => {
    smokeEmitter.loop.alive = false
    smokeEmitter.disable()
    smokeLightGroup.releaseIntoPool(smokeEmitter)
  })
}
PubSub.subscribe('x.drones.missile.start', (msg, missile) => triggerLightSmoke(missile))

const triggerSmallExplosion = (target) => {
  triggerSingleEmitter(sparkGroup, target)
}

const tmpVec1 = new Vector3()
let targetVector = new Vector3()
PubSub.subscribe('x.drones.gun.start', (msg, drone) => {
  const target = selectNearestGunTarget()
  const velocityFunction = () => {
    if (target !== null && target.gunHud) {
      tmpVec1.copy(target.position).sub(drone.position)
      tmpVec1.add(target.velocity.clone().multiplyScalar(tmpVec1.length() / 500))
      tmpVec1.normalize().multiplyScalar(500)
      targetVector.copy(tmpVec1)
    } else {
      targetVector = camera.getWorldDirection(camVec).multiplyScalar(500)
      const localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
      targetVector = targetVector.add(localY.multiplyScalar(24))
    }
    return targetVector
  }
  drone.gunEmitter = triggerSingleEmitter(bulletGroup, drone, true, velocityFunction, true)
})

PubSub.subscribe('x.drones.gun.stop', (msg, drone) => {
  if (drone.gunEmitter) {
    drone.gunEmitter.loop.alive = false
    drone.gunEmitter.disable()
    bulletGroup.releaseIntoPool(drone.gunEmitter)
  }
})

export { groups as particleGroups, triggerExplosion }
