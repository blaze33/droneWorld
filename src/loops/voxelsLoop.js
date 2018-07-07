import {
  Vector3,
  Matrix4,
  Frustum,
  Box3
} from 'three'
import {camera, scene, drone} from '../index'
import {buildVoxels, emptyKeys} from '../voxel'
import {voxelSize, voxelLayers, voxelNumber} from '../voxel/constants'

let lastCameraPosition = new Vector3(0, 0, 0)
let currentKeys = []

const voxelBuilder = (timestamp) => {
  const cameraPosition = camera.position

  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    lastCameraPosition = cameraPosition.clone()
    let i0 = Math.floor(cameraPosition.x / voxelSize)
    let j0 = Math.floor(cameraPosition.y / voxelSize)
    let visibleKeys = []
    let size = voxelNumber
    var frustum = new Frustum()
    frustum.setFromMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        for (let k = 0; k < voxelLayers; k++) {
          // let min = new Vector3(i - 2 + i0, j - 2 + j0, k).multiplyScalar(100)
          // let box = new Box3(min, min.clone().add(new Vector3(100, 100, 100)))
          // console.log(box)
          // if (frustum.intersectsBox(box)) {
          visibleKeys.push([i - Math.floor((size - 1) / 2) + i0, j - Math.floor((size - 1) / 2) + j0, k])
          // }
        }
      }
      visibleKeys.forEach(key => {
        if (!currentKeys.includes(key.toString()) && !emptyKeys.has(key)) {
          currentKeys.push(key.toString())
          console.log('build', key)
          buildVoxels(...key)
        }
      })
    }
  }
}

export {voxelBuilder}
