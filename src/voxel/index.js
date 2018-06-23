import UPNG from 'upng-js'
import ndarray from 'ndarray'
import * as THREE from 'three'
import {Octree} from '../modules'
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

const initMap = (msg) => {
  const noise = new SimplexNoise('123')
  let noiseValue
  let height
  let geometry
  const positions = new Float32Array(128 * 128 * 128)
  let x
  let y
  let mesh
  const effect = new MarchingCubes(128, new THREE.MeshNormalMaterial(), true, true)
  effect.isolation = 0
  let noiseValue1
  let noiseValue2
  let noiseValue3
  const generateVoxels = (i, j) => {
    voxel.generate([0, 0, 0], [128, 128, 128], function (x, y, z, n) {
      noiseValue1 = noise.noise3D(x / 8, y / 8, z / 8) * 0.2
      noiseValue2 = noise.noise3D(x / 32, y / 32, z / 32) * 0.5
      noiseValue3 = noise.noise3D(x / 64, y / 64, z / 64)
      positions[n] = -(z - 64) / 128 * 5 + Math.abs(noiseValue1 + noiseValue2 + noiseValue3)
    })
    // console.log(positions)
    // generate geometry
    effect.field = positions
    geometry = effect.generateGeometry()
    geometry.scale(200, 200, 200)
    geometry.mergeVertices()
    geometry.computeBoundingBox()
    geometry.computeVertexNormals()
    geometry.computeFaceNormals()
    // geometry.addGroup(0, geometry.attributes.position.count, 0)
    // console.log(geometry)
    // geometry = new THREE.Geometry().fromBufferGeometry(geometry)
    geometry = new THREE.BufferGeometry().fromGeometry(geometry)

    // console.log(geometry)
    return new THREE.Mesh(geometry, MaterialBasic())
    // return new THREE.Mesh(geometry, material)
  }
  for (var i = 0; i < 1; i++) {
    x = 1400 * i
    for (var j = 0; j < 1; j++) {
      y = 1400 * j
      // console.log(i, j, x, y)
      mesh = generateVoxels(i, j)
      mesh.position.set(x, y, 0)
      scene.add(mesh)
      // console.log(mesh)

      // const vnh = new THREE.VertexNormalsHelper(mesh, 5)
      // scene.add(vnh)
    }
  }
}
PubSub.subscribe('x.loops.loaded', initMap)
export {octree}
