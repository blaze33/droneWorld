import {
  Vector3,
  Matrix4,
  Frustum,
  Box3
} from 'three'
import {camera, scene, drone} from '../index'
import {buildVoxels, emptyKeys} from '../voxel'

let lastCameraPosition = new Vector3(0, 0, 0)
let currentKeys = []

const voxelBuilder = (timestamp) => {
  const cameraPosition = camera.position
  let targetPosition = cameraPosition.clone()

  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    lastCameraPosition = cameraPosition.clone()
    let i0 = Math.floor(cameraPosition.x / 100)
    let j0 = Math.floor(cameraPosition.y / 100)
    let z0 = Math.floor(cameraPosition.z / 100)
    let visibleKeys = []
    let size = 5
    var frustum = new Frustum()
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()
    frustum.setFromMatrix(new Matrix4().multiply(camera.projectionMatrix, camera.matrixWorldInverse))
    console.log(frustum)
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        for (let k = 0; k < 5; k++) {
          let min = new Vector3(i - 2 + i0, j - 2 + j0, k).multiplyScalar(100)
          let box = new Box3(min, min.clone().add(new Vector3(100, 100, 100)))
          console.log(box)
          if (frustum.intersectsBox(box)) {
            visibleKeys.push([i - 2 + i0, j - 2 + j0, k])
          }
        }
      }
      visibleKeys.map(key => {
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
