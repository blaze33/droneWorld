import SPE from 'shader-particle-engine'
import * as THREE from 'three'

var group = new SPE.Group( {
        texture: {
            value: THREE.ImageUtils.loadTexture(require('../textures/sprite-explosion2.png')),
            frames: new THREE.Vector2( 5, 5 ),
            loop: 1
        },
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        scale: 600
    } ),
    shockwaveGroup = new SPE.Group( {
        texture: {
            value: THREE.ImageUtils.loadTexture(require('../textures/smokeparticle.png')),
        },
        depthTest: false,
        depthWrite: true,
        blending: THREE.NormalBlending,
    } ),
    shockwave = new SPE.Emitter( {
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
            axis: new THREE.Vector3( 1, 0, 0 ),
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
    }),
    debris = new SPE.Emitter( {
        particleCount: 100,
        type: SPE.distributions.SPHERE,
        position: {
            radius: 0.1,
        },
        maxAge: {
            value: 2
        },
        duration: 2,
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
    }),
    fireball = new SPE.Emitter( {
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
    }),
    mist = new SPE.Emitter( {
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
    }),
    flash = new SPE.Emitter( {
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
    } );

group.addEmitter( fireball ).addEmitter( flash );
shockwaveGroup.addEmitter( debris ).addEmitter( mist );

group.mesh.renderOrder = 1
shockwaveGroup.mesh.renderOrder = 1

export {group as explosionGroup, shockwaveGroup}
