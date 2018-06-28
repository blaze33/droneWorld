import UPNG from 'upng-js'
import ndarray from 'ndarray'
import * as THREE from 'three'
import {Octree, SimplifyModifier} from '../modules'
import PubSub from '../events'
import {scene} from '../index'
import * as voxel from 'voxel'
import {MaterialBasic} from '../terrain/shaders/materialBasic'

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
  console.log(event)
  if (!event.data.hasGeometry) {
    emptyKeys.add([event.data.i, event.data.j, event.data.k])
    return
  }
  const positions = new Float32Array(event.data.pos)
  const normals = new Float32Array(event.data.normals)
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3))
  const mesh = new THREE.Mesh(geometry, materialBasic)
  mesh.position.set(100 * event.data.i, 100 * event.data.j, 100 * event.data.k)
  let box = new THREE.BoxHelper(mesh, 0xffff00)
  scene.add(box)
  scene.add(mesh)
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
  workerPool.postMessage([i, j, k, 5])
}

export {buildVoxels, emptyKeys}
