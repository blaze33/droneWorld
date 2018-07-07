import UPNG from 'upng-js'
import ndarray from 'ndarray'
import * as THREE from 'three'
import {Octree, SimplifyModifier} from '../modules'
import PubSub from '../events'
import {scene} from '../index'
import * as voxel from 'voxel'
import {MaterialBasic} from '../terrain/shaders/materialBasic'
import {voxelSize, voxelLayers} from './constants'

import Worker from './voxel.worker.js'

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
const emptyKeys = new Set()

const buildVoxelsFromWorker = (event) => {
  if (!event.data.hasGeometry) {
    emptyKeys.add([event.data.i, event.data.j, event.data.k])
    return
  }
  const lod = new THREE.LOD()
  const positions = [
    new Float32Array(event.data.pos1)
    // new Float32Array(event.data.pos2)
  ]
  const normals = [
    new Float32Array(event.data.normals1)
    // new Float32Array(event.data.normals2)
  ]
  const indices = [
    new Uint16Array(event.data.index1)
    // new Uint16Array(event.data.index2)
  ]
  const lodDistances = [0, 200, 500]
  for (var i = 0; i < 1; i++) {
    const geometry = new THREE.BufferGeometry()
    geometry.addAttribute('position', new THREE.BufferAttribute(positions[i], 3))
    geometry.addAttribute('normal', new THREE.BufferAttribute(normals[i], 3))
    geometry.setIndex(new THREE.BufferAttribute(indices[i], 1))
    const mesh = new THREE.Mesh(geometry, materialBasic)
    // const mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial({wireframe: true}))
    lod.addLevel(mesh, lodDistances[i])
  }
  lod.position.set(voxelSize * event.data.i, voxelSize * event.data.j, voxelSize * event.data.k)
  let box = new THREE.BoxHelper(lod, 0xffff00)
  scene.add(box)
  scene.add(lod)
}

let workerPool = []
const workerPoolSize = navigator.hardwareConcurrency - 1 || 3
for (let i = 0; i < workerPoolSize; i++) {
  const worker = new Worker()
  worker.onmessage = buildVoxelsFromWorker
  workerPool.push(worker)
}
let currentWorker = 0
workerPool.postMessage = args => {
  const worker = workerPool[currentWorker]
  worker.postMessage(args)
  currentWorker = currentWorker === workerPoolSize - 1 ? 0 : currentWorker + 1
}

const buildVoxels = (i, j, k) => {
  workerPool.postMessage([i, j, k, voxelLayers])
}

export {buildVoxels, emptyKeys, voxelSize}
