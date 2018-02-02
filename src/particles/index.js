import SPE from 'shader-particle-engine/build/SPE'
import * as THREE from 'three'
import PubSub from '../events'
// import {scene} from '../index'
import {targetsInFront} from '../hud'
import {camera} from '../index'

// GROUPS
const textureLoader = new THREE.TextureLoader()
const fireGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/Explosion_002_Tile_8x8_256x256.png')),
    frames: new THREE.Vector2(8, 8),
    // value: textureLoader.load(require('../textures/sprite-explosion2.png')),
    // frames: new THREE.Vector2(5, 5),
    loop: 1
  },
  depthTest: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  scale: 600,
  maxParticleCount: 100000
}
const pointsGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/smokeparticle.png'))
  },
  depthTest: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  maxParticleCount: 100000
}
const debrisGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/spark.png'))
  },
  depthTest: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  maxParticleCount: 100000
}
const bulletGroupOptions = {
  texture: {
    value: textureLoader.load(require('../textures/bullet.png'))
  },
  depthTest: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  maxParticleCount: 100000
}

// EMITTERS
const shockwaveOptions = {
  particleCount: 200,
  type: SPE.distributions.DISC,
  position: {
    radius: 5,
    spread: new THREE.Vector3(5)
  },
  maxAge: {
    value: 2,
    spread: 0
  },
  duration: 1,
  activeMultiplier: 2000,

  velocity: {
    value: new THREE.Vector3(40)
  },
  rotation: {
    axis: new THREE.Vector3(0, 0, 1),
    angle: Math.PI * 0.5,
    static: true
  },
  size: { value: 2 },
  color: {
    value: [
      new THREE.Color(0.4, 0.2, 0.1),
      new THREE.Color(0.2, 0.2, 0.2)
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
    value: new THREE.Vector3(100)
  },
  acceleration: {
    value: new THREE.Vector3(0, 0, -20),
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
      new THREE.Color(1, 1, 1),
      new THREE.Color(1, 1, 0),
      new THREE.Color(1, 0, 0),
      new THREE.Color(0.4, 0.2, 0.1)
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
    value: new THREE.Vector3(10)
  },
  size: { value: [20, 100] },
  color: {
    value: [
      new THREE.Color(0.5, 0.1, 0.05),
      new THREE.Color(0.2, 0.2, 0.2)
    ]
  },
  opacity: { value: [0.5, 0.35, 0.1, 0] }
}
const mistOptions = {
  particleCount: 100,
  position: {
    spread: new THREE.Vector3(15, 15, 15),
    distribution: SPE.distributions.SPHERE
  },
  maxAge: { value: 2 },
  duration: 1,
  activeMultiplier: 2000,
  velocity: {
    value: new THREE.Vector3(8, 3, 10),
    distribution: SPE.distributions.SPHERE
  },
  size: { value: 40 },
  color: {
    value: new THREE.Color(0.2, 0.2, 0.2)
  },
  opacity: { value: [0, 0, 0.4, 0] }
}
const flashOptions = {
  duration: 1,
  particleCount: 50,
  position: { spread: new THREE.Vector3(5, 5, 5) },
  velocity: {
    spread: new THREE.Vector3(30),
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
    spread: new THREE.Vector3(1, 1, 1)
  },
  maxAge: { value: 10 },
  duration: 10,
  // activeMultiplier: 2000,
  velocity: {
    value: new THREE.Vector3(4, 2, 5),
    distribution: SPE.distributions.SPHERE
  },
  size: { value: [20, 60] },
  color: {
    value: new THREE.Color(0.9, 0.9, 0.9)
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
    value: new THREE.Vector3(100),
    spread: new THREE.Vector3(20, 20, 20)
  },
  acceleration: {
    value: 0
  },
  size: {
    value: 1
  },
  color: {
    value: [
      new THREE.Color(1, 1, 1),
      new THREE.Color(1, 1, 0)
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
    value: new THREE.Vector3(100)
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
      new THREE.Color(1, 1, 1),
      new THREE.Color(1, 1, 0)
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

const bulletGroup = new SPE.Group(bulletGroupOptions)
const sparkGroup = new SPE.Group(debrisGroupOptions)

const poolSize = 100
const createNew = false

flashGroup.addPool(poolSize, flashOptions, createNew)
fireGroup.addPool(poolSize, fireOptions, createNew)

debrisGroup.addPool(poolSize, debrisOptions, createNew)
shockGroup.addPool(poolSize, shockwaveOptions, createNew)
mistGroup.addPool(poolSize, mistOptions, createNew)
smokeGroup.addPool(poolSize, smokeOptions, createNew)

bulletGroup.addPool(poolSize, bulletOptions, createNew)
sparkGroup.addPool(poolSize, sparkOptions, createNew)

const groups = [
  flashGroup,
  fireGroup,
  debrisGroup,
  shockGroup,
  mistGroup,
  smokeGroup,
  bulletGroup,
  sparkGroup
]
// avoid artifacts with the ocean
groups.forEach(group => { group.mesh.renderOrder = 2 })
smokeGroup.mesh.renderOrder = 1
// cf. https://github.com/squarefeet/ShaderParticleEngine/issues/126
groups.forEach(group => { group.mesh.frustumCulled = false })

window.smokeGroup = smokeGroup

const triggerSingleEmitter = (group, target, follow = false, velocityFunction, offset = false) => {
  const emitter = group.getFromPool()

  if (emitter === null) {
    console.log('SPE.Group pool ran out.')
    return
  }

  if (offset) {
    emitter.position.value = target.position.clone().add(
      camera.getWorldDirection().multiplyScalar(5)
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
  const chunkReducer = (chunkSize) =>
    (ar, it, i) => {
      const ix = Math.floor(i / chunkSize)
      if (!ar[ix]) ar[ix] = []
      ar[ix].push(it)
      return ar
    }

  const loop = {
    loop: () => {
      if (offset) {
        emitter.position.value = target.position.clone().add(
          camera.getWorldDirection().multiplyScalar(5)
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
            ? new THREE.Vector3(...initialPositions[i]).add(
                new THREE.Vector3(...velocities[i]).multiplyScalar(param[1])
              )
            : null
        }).filter(position => position != null)
        collisions = []
        positions.forEach(pos => {
          targetsInFront.forEach(target => {
            if (target.position.clone().sub(pos).length() < 10) {
              collisions.push([target, pos])
            }
          })
        })
        if (collisions.length) {
          collisions.forEach(ar => {
            PubSub.publish('x.sound.impact', ar[0])
            triggerSmallExplosion({position: ar[1]})
            ar[0].life -= 5
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
    })
  }

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
  triggerSingleEmitter(smokeGroup, target, true)
  triggerSingleEmitter(flashGroup, target)
  triggerSingleEmitter(fireGroup, target)
  triggerSingleEmitter(debrisGroup, target)
  triggerSingleEmitter(mistGroup, target)
}

const triggerSmallExplosion = (target) => {
  triggerSingleEmitter(sparkGroup, target)
}

PubSub.subscribe('x.drones.gun.start', (msg, drone) => {
  const velocityFunction = () => {
    let targetVector = camera.getWorldDirection().multiplyScalar(500)
    const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    targetVector = targetVector.add(localY.multiplyScalar(24))
    return targetVector
  }
  drone.gunEmitter = triggerSingleEmitter(bulletGroup, drone, true, velocityFunction, true)
})

PubSub.subscribe('x.drones.gun.stop', (msg, drone) => {
  drone.gunEmitter.disable()
})

export {groups as particleGroups, triggerExplosion}
