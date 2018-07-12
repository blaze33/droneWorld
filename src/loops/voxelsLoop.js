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
window.currentKeys = currentKeys
let keyString

const voxelBuilder = (timestamp) => {
  const cameraPosition = camera.position

  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    lastCameraPosition = cameraPosition.clone()
    let i0 = Math.floor(cameraPosition.x / voxelSize + 0.5)
    let j0 = Math.floor(cameraPosition.y / voxelSize + 0.5)
    console.log('camera centered on tile ', i0, j0)
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
    }

    visibleKeys.forEach(key => {
      keyString = key.toString()
      if (!emptyKeys.has(keyString) && !currentKeys.includes(keyString)) {
        currentKeys.push(keyString)
        console.log('build', key)
        buildVoxels(...key)
      }
    })

    let sub = new Vector3()
    let cameraXY = new Vector3()
    let objectXY = new Vector3()
    let distance
    scene.children.filter(child => child.userData.key).forEach(voxelBlock => {
      distance = sub.subVectors(
        cameraXY.set(camera.position.x, camera.position.y, 0),
        objectXY.set(voxelBlock.position.x, voxelBlock.position.y, 0)
      ).length()
      let cutOffDistance = voxelSize * Math.ceil(voxelNumber / 2) * 1.1
      console.log('cut-off distance ', cutOffDistance.toFixed(0))
      voxelBlock.visible = distance < cutOffDistance
    })
  }
}

export {voxelBuilder}
