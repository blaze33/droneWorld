import * as THREE from 'three'
import PubSub from '../events'
import {scene} from '../index'
import {MaterialBasic} from '../materials/terrainVoxel'
import {voxelSize, voxelLayers} from './constants'

import Worker from './voxel.worker.js'

const materialBasic = MaterialBasic()
const emptyKeys = new Set()
window.emptyKeys = emptyKeys

const buildVoxelsFromWorker = (event) => {
  const key = [event.data.i, event.data.j, event.data.k]
  if (!event.data.hasGeometry) {
    emptyKeys.add(key.toString())
    return
  }

  const positions = new Float32Array(event.data.pos1)
  const normals = new Float32Array(event.data.normals1)
  const indices = new Uint16Array(event.data.index1)

  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  const mesh = new THREE.Mesh(geometry, materialBasic)
  // const mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial({wireframe: true}))

  mesh.position.set(voxelSize * event.data.i, voxelSize * event.data.j, voxelSize * event.data.k)
  mesh.userData.key = key
  let box = new THREE.BoxHelper(mesh, 0xffff00)
  mesh.name = 'terrainVoxel'
  box.name = 'terrainVoxelHelper'
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
  workerPool.postMessage([i, j, k, voxelLayers])
}

export {buildVoxels, emptyKeys, voxelSize}
