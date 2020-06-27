import {
  Vector3,
  Matrix4,
  Frustum
} from 'three'
import { camera, scene } from '../index'
import { buildVoxels, emptyKeys } from '../voxel'
import { voxelSize, voxelLayers, voxelNumber } from '../voxel/constants'

let lastCameraPosition = new Vector3(0, 0, 0)
let currentKeys = []
window.currentKeys = currentKeys
let keyString

const voxelBuilder = (timestamp) => {
  const cameraPosition = camera.position

  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    lastCameraPosition = cameraPosition.clone()
    const i0 = Math.floor(cameraPosition.x / voxelSize + 0.5)
    const j0 = Math.floor(cameraPosition.y / voxelSize + 0.5)
    console.log('camera centered on tile ', i0, j0)
    const visibleKeys = []
    const size = voxelNumber
    var frustum = new Frustum()
    frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        for (let k = 0; k < voxelLayers; k++) {
          visibleKeys.push([i - Math.floor((size - 1) / 2) + i0, j - Math.floor((size - 1) / 2) + j0, k])
        }
      }
    }

    visibleKeys.forEach(key => {
      keyString = key.toString()
      if (!emptyKeys.has(keyString) && !currentKeys.includes(keyString)) {
        currentKeys.push(keyString)
        console.log('build', key)
        buildVoxels(...key)
      }
    })

    const sub = new Vector3()
    const cameraXY = new Vector3()
    const objectXY = new Vector3()
    let distance
    scene.children.filter(child => child.userData.key).forEach(voxelBlock => {
      distance = sub.subVectors(
        cameraXY.set(camera.position.x, camera.position.y, 0),
        objectXY.set(voxelBlock.position.x, voxelBlock.position.y, 0)
      ).length()
      const cutOffDistance = voxelSize * Math.ceil(voxelNumber / 2) * 1.1
      voxelBlock.visible = distance < cutOffDistance
    })
  }
}

const deleteTile = (tile) => {
  scene.remove(tile)
  tile.geometry.dispose()
  tile.geometry = null
  tile.material.dispose()
  tile.material = null
}

voxelBuilder.clean = () => {
  scene.children
    .filter(child => ['terrainVoxel', 'terrainVoxelHelper'].includes(child.name))
    .forEach(tile => deleteTile(tile))
  currentKeys = []
  lastCameraPosition = new Vector3(0, 0, 0)
}

export { voxelBuilder }
