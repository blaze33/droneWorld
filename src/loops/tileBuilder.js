import {
  Vector3,
} from 'three'
import {camera, scene, drone} from '../index'
import {buildPlane} from '../terrain'

const tileSize = 800
let lastCameraPosition = new Vector3(0, 0, 0)
let tiles = {}
let pngs = {}
let currentKeysArray = []
window.tiles = tiles
window.pngs = pngs

const tileBuilder = (timestamp) => {
  const cameraPosition = camera.position
  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    lastCameraPosition = cameraPosition.clone()

    const camVec = camera.getWorldDirection();
    let targetPosition = cameraPosition.clone()

    targetPosition = targetPosition.add(camVec.multiplyScalar(400 * Math.max(1, Math.abs(cameraPosition.z) / 400)))
    drone.position.set(targetPosition.x, targetPosition.y, 0)

    const z0 = 10
    const zoomDelta = Math.min(7, Math.floor(Math.sqrt(Math.abs(cameraPosition.z)) / 28))
    // const zoomDelta = 0
    const zoom = z0 - zoomDelta
    const currentTileSize = tileSize * Math.pow(2, zoomDelta)

    const x0 = Math.round(targetPosition.x / currentTileSize)
    const y0 = -Math.round(targetPosition.y / currentTileSize)

    const segments0 = cameraPosition.z > 2000 ? 127 : 255
    const segments1 = cameraPosition.z > 2000 ? 31 : 63
    // const segments0 = 32
    // const segments1 = 15
    const segments2 = 15

    let visibleKeysArray = [
        [zoom, x0,     y0    , segments0, 0, currentTileSize],
        [zoom, x0,     y0 + 1, segments0, 0, currentTileSize],
        [zoom, x0 + 1, y0    , segments0, 0, currentTileSize],
        [zoom, x0 + 1, y0 + 1, segments0, 0, currentTileSize],

        [zoom, x0 - 1, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 - 0, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 + 1, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 + 2, segments1, 0, currentTileSize],

        [zoom, x0 + 2, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 + 2, y0 - 0, segments1, 0, currentTileSize],
        [zoom, x0 + 2, y0 + 1, segments1, 0, currentTileSize],
        [zoom, x0 + 2, y0 + 2, segments1, 0, currentTileSize],

        [zoom, x0    , y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0    , y0 + 2, segments1, 0, currentTileSize],
        [zoom, x0 + 1, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 + 1, y0 + 2, segments1, 0, currentTileSize],

        // [zoom, x0 - 2, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 - 1, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 - 0, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 + 1, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 + 2, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 + 3, segments2, 0, currentTileSize],

        // [zoom, x0 + 3, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 - 1, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 - 0, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 + 1, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 + 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 + 3, segments2, 0, currentTileSize],

        // [zoom, x0 - 1, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 - 1, y0 + 3, segments2, 0, currentTileSize],
        // [zoom, x0    , y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0    , y0 + 3, segments2, 0, currentTileSize],
        // [zoom, x0 + 1, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 1, y0 + 3, segments2, 0, currentTileSize],
        // [zoom, x0 + 2, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 2, y0 + 3, segments2, 0, currentTileSize],

    ]

    // let camera = terrainTarget.native
    // // camera.updateMatrix(); // make sure camera's local matrix is updated
    // // camera.updateMatrixWorld(); // make sure camera's world matrix is updated
    // // camera.matrixWorldInverse.getInverse( camera.matrixWorld );
    // var frustum = new THREE.Frustum();
    // frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    // console.log( frustum );

    const visibleKeysString = visibleKeysArray.map(k => k.toString())
    const currentKeysString = currentKeysArray.map(k => k.toString())
    const newKeys = visibleKeysString.filter(x => currentKeysString.indexOf(x) < 0)
    // const oldKeys = currentKeysString.filter(x => visibleKeysString.indexOf(x) < 0)

    // if (oldKeys) {console.log('deleting', oldKeys.sort())}
    // if (newKeys) {console.log('adding', newKeys.sort())}

    newKeys.forEach(newKey => {
      const zxyijs = newKey.split(',').map(x => parseInt(x, 10))
      buildPlane(...zxyijs)
    })
    const deleteTile = (tile) => {
      scene.remove(tile)
      tile.geometry.dispose()
      tile.geometry = null
      tile.material.dispose()
      tile.material = null
    }
    scene.children.filter(
      child => child.key && visibleKeysString.indexOf(child.key) < 0
    ).map(
      tile => {
        if (!tile.markedForDeletion) {
          new Promise((resolve) => window.setTimeout(() => deleteTile(tile), 750))
          tile.markedForDeletion = true
        }
      }
    )

    currentKeysArray = visibleKeysArray.slice(0)

  }
}

export {tileBuilder}
