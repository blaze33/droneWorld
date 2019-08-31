import {
  Vector3
} from 'three'
import { camera, scene, drone } from '../index'
import { dirLight } from '../lights'
import { buildPlane } from '../terrain'

const tileSize = 800
const maxTilesInMemory = 128
let lastCameraPosition = new Vector3(0, 0, 0)
const tiles = {}
const pngs = {}
let currentKeysArray = []
window.tiles = tiles
window.pngs = pngs

const deleteTile = (tile) => {
  scene.remove(tile)
  tile.geometry.dispose()
  tile.geometry = null
  tile.material.dispose()
  tile.material = null
}

let camVec = new Vector3()
const tileBuilder = (timestamp) => {
  const cameraPosition = camera.position
  camVec = camera.getWorldDirection(camVec)
  let targetPosition = cameraPosition.clone()

  targetPosition = targetPosition.add(camVec.multiplyScalar(400 * Math.max(1, Math.abs(cameraPosition.z) / 400)))
  drone.position.set(targetPosition.x, targetPosition.y, 200)
  dirLight.updatePosition()

  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    lastCameraPosition = cameraPosition.clone()

    const z0 = 10
    const zoomDelta = Math.min(7, Math.floor(Math.sqrt(Math.abs(cameraPosition.z)) / 28))
    // const zoomDelta = 0
    const zoom = z0 - zoomDelta
    const currentTileSize = tileSize * Math.pow(2, zoomDelta)

    const x0 = Math.round(targetPosition.x / currentTileSize)
    const y0 = -Math.round(targetPosition.y / currentTileSize)

    const segments0 = cameraPosition.z > 2000 ? 127 : 127
    const segments1 = cameraPosition.z > 2000 ? 31 : 63
    // const segments0 = 32
    // const segments1 = 15
    const segments2 = 15

    const cutOffDistance = currentTileSize * 3
    const distanceVector = new Vector3()
    const cameraXY = new Vector3()
    const objectXY = new Vector3()
    let distance

    const visibleKeysArray = [

      [zoom, x0 - 2, y0 - 2, segments2, 0, currentTileSize],
      [zoom, x0 - 2, y0 - 1, segments2, 0, currentTileSize],
      [zoom, x0 - 2, y0 - 0, segments2, 0, currentTileSize],
      [zoom, x0 - 2, y0 + 1, segments2, 0, currentTileSize],
      [zoom, x0 - 2, y0 + 2, segments2, 0, currentTileSize],
      [zoom, x0 - 2, y0 + 3, segments2, 0, currentTileSize],

      [zoom, x0 + 3, y0 - 2, segments2, 0, currentTileSize],
      [zoom, x0 + 3, y0 - 1, segments2, 0, currentTileSize],
      [zoom, x0 + 3, y0 - 0, segments2, 0, currentTileSize],
      [zoom, x0 + 3, y0 + 1, segments2, 0, currentTileSize],
      [zoom, x0 + 3, y0 + 2, segments2, 0, currentTileSize],
      [zoom, x0 + 3, y0 + 3, segments2, 0, currentTileSize],

      [zoom, x0 - 1, y0 - 2, segments2, 0, currentTileSize],
      [zoom, x0 - 1, y0 + 3, segments2, 0, currentTileSize],
      [zoom, x0, y0 - 2, segments2, 0, currentTileSize],
      [zoom, x0, y0 + 3, segments2, 0, currentTileSize],
      [zoom, x0 + 1, y0 - 2, segments2, 0, currentTileSize],
      [zoom, x0 + 1, y0 + 3, segments2, 0, currentTileSize],
      [zoom, x0 + 2, y0 - 2, segments2, 0, currentTileSize],
      [zoom, x0 + 2, y0 + 3, segments2, 0, currentTileSize],

      [zoom, x0 - 1, y0 - 1, segments1, 0, currentTileSize],
      [zoom, x0 - 1, y0 - 0, segments1, 0, currentTileSize],
      [zoom, x0 - 1, y0 + 1, segments1, 0, currentTileSize],
      [zoom, x0 - 1, y0 + 2, segments1, 0, currentTileSize],

      [zoom, x0 + 2, y0 - 1, segments1, 0, currentTileSize],
      [zoom, x0 + 2, y0 - 0, segments1, 0, currentTileSize],
      [zoom, x0 + 2, y0 + 1, segments1, 0, currentTileSize],
      [zoom, x0 + 2, y0 + 2, segments1, 0, currentTileSize],

      [zoom, x0, y0 - 1, segments1, 0, currentTileSize],
      [zoom, x0, y0 + 2, segments1, 0, currentTileSize],
      [zoom, x0 + 1, y0 - 1, segments1, 0, currentTileSize],
      [zoom, x0 + 1, y0 + 2, segments1, 0, currentTileSize],

      [zoom, x0, y0, segments0, 0, currentTileSize],
      [zoom, x0, y0 + 1, segments0, 0, currentTileSize],
      [zoom, x0 + 1, y0, segments0, 0, currentTileSize],
      [zoom, x0 + 1, y0 + 1, segments0, 0, currentTileSize]
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

    // compute tile under the camera
    const potentialUnderKeys = visibleKeysString.slice(-5)
    const potentialUnderTiles = scene.children.filter(child => potentialUnderKeys.includes(child.key))
    const tileToCamera = (tile) => {
      return distanceVector.subVectors(tile.position, camera.position).length()
    }
    potentialUnderTiles.sort((a, b) =>
      tileToCamera(a) - tileToCamera(b)
    )
    camera.userData.terrainKeysUnder = potentialUnderKeys
    camera.userData.terrainTileUnder = potentialUnderTiles[0]

    const newKeys = visibleKeysString.filter(x => currentKeysString.indexOf(x) < 0)
    const existingKeys = scene.children.filter(child => child.key).map(tile => tile.key)

    // build new keys
    newKeys.forEach(newKey => {
      if (existingKeys.includes(newKey)) {
        return
      }
      const zxyijs = newKey.split(',').map(x => parseInt(x, 10))
      buildPlane(...zxyijs)
    })

    // switch tiles visibility with regard to their distance to the camera
    const hiddenTiles = []
    scene.children.filter(child => child.key)
      .forEach(tile => {
        distance = distanceVector.subVectors(
          objectXY.set(tile.position.x, tile.position.y, 0),
          cameraXY.set(camera.position.x, camera.position.y, 0)
        ).length()
        tile.userData.distanceToCamera = distance
        if (distance < cutOffDistance && visibleKeysString.includes(tile.key)) {
          tile.visible = true
        } else {
          hiddenTiles.push(tile)
        }
      })
    window.setTimeout(() => {
      hiddenTiles.forEach(tile => { tile.visible = false })
    }, 750)

    // delete some distant tiles
    scene.children.filter(child => child.key)
      .sort((a, b) => a.userData.distanceToCamera - b.userData.distanceToCamera)
      .slice(maxTilesInMemory)
      .forEach(tile => {
        if (!tile.markedForDeletion) {
          window.setTimeout(() => deleteTile(tile), 750)
          tile.markedForDeletion = true
        }
      })

    currentKeysArray = visibleKeysArray.slice(0)
  }
}

tileBuilder.clean = () => {
  scene.children
    .filter(child => child.name === 'terrainTile')
    .forEach(tile => deleteTile(tile))
  currentKeysArray = []
  lastCameraPosition = new Vector3(0, 0, 0)
}

export { tileBuilder }
