import UPNG from 'upng-js'
import ndarray from 'ndarray'
import * as THREE from 'three'
import {Octree, SimplifyModifier} from '../modules'
import PubSub from '../events'
import {scene} from '../index'
import * as voxel from 'voxel'
import {MaterialBasic} from '../terrain/shaders/materialBasic'

import SimplexNoise from 'simplex-noise'

require('three/examples/js/MarchingCubes.js')

const MarchingCubes = global.THREE.MarchingCubes

const octree = new Octree({
                // uncomment below to see the octree (may kill the fps)
                // scene: scene,
                // when undeferred = true, objects are inserted immediately
                // instead of being deferred until next octree.update() call
                // this may decrease performance as it forces a matrix update
  undeferred: false,
                // set the max depth of tree
  depthMax: Infinity,
                // max number of objects before nodes split or merge
  objectsThreshold: 8,
                // percent between 0 and 1 that nodes will overlap each other
                // helps insert objects that lie over more than one node
  overlapPct: 0.15
})

const materialBasic = MaterialBasic()

const initMap = (msg) => {
  const noise = new SimplexNoise('123')
  let noiseValue
  let height
  let geometry
  let dim = 32
  const positions = new Float32Array(dim * dim * dim)
  let x
  let y
  let z
  let mesh
  const effect = new MarchingCubes(dim, new THREE.MeshNormalMaterial(), true, true)
  effect.isolation = 0
  let noiseValue1
  let noiseValue2
  let noiseValue3
  let tmpVector = new THREE.Vector3()
  const emptyKeys = new Set()
  const generateVoxels = (i, j, k, zMax) => {
    let noiseValue
    let n = 0
    let noGeometry = true
    for (let z = k * (dim - 3); z < k * (dim - 3) + dim; z++) {
      for (let y = j * (dim - 3); y < j * (dim - 3) + dim; y++) {
        for (let x = i * (dim - 3); x < i * (dim - 3) + dim; x++, n++) {
          noiseValue = noise.noise3D(x / 128, y / 128, z / 128) * 0.5
          noiseValue += noise.noise3D(x / 64, y / 64, z / 64) * 0.25
          noiseValue += noise.noise3D(x / 32, y / 32, z / 32) * 0.125
          noiseValue += noise.noise3D(x / 16, y / 16, z / 16) * 0.0625
          noiseValue += noise.noise3D(x / 8, y / 8, z / 8) * 0.03125
          noiseValue += noise.noise3D(x / 4, y / 4, z / 4) * 0.015625
          positions[n] = -(z - zMax * (dim - 3) / 2) / (zMax * (dim - 3)) + noiseValue * 0.5
          if (n === 0) continue
          noGeometry = noGeometry ? Math.sign(positions[n]) == Math.sign(positions[n - 1]) : false
        }
      }
    }
    if (noGeometry) {
      emptyKeys.add([i, j, k])
      return null
    }
    // generate geometry
    effect.field = positions
    geometry = effect.generateBufferGeometry()

    if (!geometry.attributes.position) {
      emptyKeys.add([i, j, k])
      return null
    }

    geometry.computeBoundingBox()
    geometry.boundingBox.getSize(tmpVector)
    let scaleFactor = 100 / 1.8125
    geometry.scale(scaleFactor, scaleFactor, scaleFactor)

    // const simple = new SimplifyModifier()
    // console.log(geometry.vertices.length)
    // geometry = simple.modify(geometry, Math.floor(geometry.vertices.length * 0.95))
    // geometry.computeVertexNormals()
    // geometry.computeFaceNormals()

    console.log(geometry)
    geometry = new THREE.Geometry().fromBufferGeometry(geometry)
    geometry.mergeVertices()
    geometry.computeVertexNormals()
    geometry.computeFaceNormals()
    geometry = new THREE.BufferGeometry().fromGeometry(geometry)

    // geometry.computeBoundingBox()
    // geometry.computeVertexNormals()
    // geometry.computeFaceNormals()

    // return new THREE.Mesh(geometry, new THREE.MeshNormalMaterial({wireframe: true}))
    return new THREE.Mesh(geometry, materialBasic)
  }

  let zMax = 5
  for (var i = 0; i < 5; i++) {
    x = 100 * i
    for (var j = 0; j < 5; j++) {
      y = 100 * j
      for (var k = 0; k < zMax; k++) {
        z = 100 * k
        mesh = generateVoxels(i, j, k, zMax)
        if (mesh === null) continue
        mesh.position.set(x, y, z)
        let box = new THREE.BoxHelper(mesh, 0xffff00)
        scene.add(box)
        // let helper = new THREE.VertexNormalsHelper(mesh, 2, 0x00ff00, 1)
        // scene.add(helper)
        // let faceHelper = new THREE.FaceNormalsHelper(mesh, 2, 0xff0000, 1)
        // scene.add(faceHelper)

        scene.add(mesh)
      }
    }
  }
  console.log(emptyKeys)
}
PubSub.subscribe('x.loops.loaded', initMap)
export {octree}
