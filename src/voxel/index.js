import {
  BufferGeometry,
  BufferAttribute,
  Mesh,
  // MeshNormalMaterial,
  BoxHelper
} from 'three'
import { scene } from '../index'
import { MaterialBasic } from '../materials/terrainVoxel'
import { voxelSize, voxelLayers, voxelOffset } from './constants'

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

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setIndex(new BufferAttribute(indices, 1))
  const mesh = new Mesh(geometry, materialBasic)
  // const mesh = new Mesh(geometry, new MeshNormalMaterial({wireframe: true}))

  mesh.position.set(
    voxelSize * event.data.i + voxelOffset.x,
    voxelSize * event.data.j + voxelOffset.y,
    voxelSize * event.data.k + voxelOffset.z
  )
  mesh.userData.key = key
  const box = new BoxHelper(mesh, 0xffff00)
  mesh.name = 'terrainVoxel'
  box.name = 'terrainVoxelHelper'
  mesh.layers.enable(3)
  box.layers.enable(3)
  scene.add(box)
  scene.add(mesh)
}

const workerPool = []
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

export { buildVoxels, emptyKeys, voxelSize }
