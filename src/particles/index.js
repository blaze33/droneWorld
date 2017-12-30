import SPE from 'shader-particle-engine/build/SPE'
import * as THREE from 'three'

// GROUPS
const textureLoader = new THREE.TextureLoader()
const fireGroupOptions = {
    texture: {
        value: textureLoader.load(require('../textures/sprite-explosion2.png')),
        frames: new THREE.Vector2( 5, 5 ),
        loop: 1
    },
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    scale: 600,
    maxParticleCount: 100000,
}
const pointsGroupOptions = {
    texture: {
        value: textureLoader.load(require('../textures/smokeparticle.png')),
    },
    depthTest: false,
    depthWrite: true,
    blending: THREE.NormalBlending,
    maxParticleCount: 100000,
}

// EMITTERS
const shockwaveOptions = {
    particleCount: 200,
    type: SPE.distributions.DISC,
    position: {
        radius: 5,
        spread: new THREE.Vector3( 5 )
    },
    maxAge: {
        value: 2,
        spread: 0
    },
    duration: 1,
    activeMultiplier: 2000,

    velocity: {
        value: new THREE.Vector3( 40 )
    },
    rotation: {
        axis: new THREE.Vector3( 0, 0, 1 ),
        angle: Math.PI * 0.5,
        static: true
    },
    size: { value: 2 },
    color: {
        value: [
            new THREE.Color( 0.4, 0.2, 0.1 ),
            new THREE.Color( 0.2, 0.2, 0.2 )
        ]
    },
    opacity: { value: [0.5, 0.2, 0] }
}
const debrisOptions = {
    particleCount: 100,
    type: SPE.distributions.SPHERE,
    position: {
        radius: 0.1,
    },
    maxAge: {
        value: 2
    },
    duration: 1,
    activeMultiplier: 40,

    velocity: {
        value: new THREE.Vector3( 100 )
    },
    acceleration: {
        value: new THREE.Vector3( 0, -20, 0 ),
        distribution: SPE.distributions.BOX
    },
    size: { value: 2 },
    drag: {
        value: 1
    },
    color: {
        value: [
            new THREE.Color( 1, 1, 1 ),
            new THREE.Color( 1, 1, 0 ),
            new THREE.Color( 1, 0, 0 ),
            new THREE.Color( 0.4, 0.2, 0.1 )
        ]
    },
    opacity: { value: [0.4, 0] }
}
const fireOptions = {
    particleCount: 20,
    type: SPE.distributions.SPHERE,
    position: {
        radius: 1
    },
    maxAge: { value: 2 },
    duration: 1,
    activeMultiplier: 20,
    velocity: {
        value: new THREE.Vector3( 10 )
    },
    size: { value: [20, 100] },
    color: {
        value: [
            new THREE.Color( 0.5, 0.1, 0.05 ),
            new THREE.Color( 0.2, 0.2, 0.2 )
        ]
    },
    opacity: { value: [0.5, 0.35, 0.1, 0] }
}
const mistOptions = {
    particleCount: 50,
    position: {
        spread: new THREE.Vector3( 10, 10, 10 ),
        distribution: SPE.distributions.SPHERE
    },
    maxAge: { value: 2 },
    duration: 1,
    activeMultiplier: 2000,
    velocity: {
        value: new THREE.Vector3( 8, 3, 10 ),
        distribution: SPE.distributions.SPHERE
    },
    size: { value: 40 },
    color: {
        value: new THREE.Color( 0.2, 0.2, 0.2 )
    },
    opacity: { value: [0, 0, 0.2, 0] }
}
const flashOptions = {
    duration: 1,
    particleCount: 50,
    position: { spread: new THREE.Vector3( 5, 5, 5 ) },
    velocity: {
        spread: new THREE.Vector3( 30 ),
        distribution: SPE.distributions.SPHERE
    },
    size: { value: [2, 20, 20, 20] },
    maxAge: { value: 2 },
    activeMultiplier: 2000,
    opacity: { value: [0.5, 0.25, 0, 0] }
}

const flashGroup = new SPE.Group(fireGroupOptions)
const fireGroup = new SPE.Group(fireGroupOptions)

const debrisGroup = new SPE.Group(pointsGroupOptions)
const shockGroup = new SPE.Group(pointsGroupOptions)
const mistGroup = new SPE.Group(pointsGroupOptions)

const poolSize = 100
const createNew = false

flashGroup.addPool(poolSize, flashOptions, createNew)
fireGroup.addPool(poolSize, fireOptions, createNew)

debrisGroup.addPool(poolSize, debrisOptions, createNew)
shockGroup.addPool(poolSize, shockwaveOptions, createNew)
mistGroup.addPool(poolSize, mistOptions, createNew)

const groups = [
    flashGroup,
    fireGroup,
    debrisGroup,
    shockGroup,
    mistGroup,
]
// avoid artifacts with the ocean
groups.forEach(group => group.mesh.renderOrder = 1)
// cf. https://github.com/squarefeet/ShaderParticleEngine/issues/126
groups.forEach(group => group.mesh.frustumCulled = false)

const triggerExplosion = (position) => {
    flashGroup.triggerPoolEmitter(1, position)
    fireGroup.triggerPoolEmitter(1, position)
    debrisGroup.triggerPoolEmitter(1, position)
    shockGroup.triggerPoolEmitter(1, position)
    mistGroup.triggerPoolEmitter(1, position)
}

export {groups as particleGroups, triggerExplosion}
