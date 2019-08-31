/* eslint-env worker */

import SimplexNoise from 'simplex-noise'
import {
  Geometry,
  MeshNormalMaterial
} from 'three'
// import { Geometry } from 'three/src/core/Geometry'
// import { MeshNormalMaterial } from 'three/src/materials/MeshNormalMaterial'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js'
import { voxelSize } from './constants'

const simple = new SimplifyModifier()
const noise = new SimplexNoise('123')

const generateVoxels = (i, j, k, zMax) => {
  console.time([i, j, k].toString())
  let n = 0
  let noGeometry = true
  let noiseValue
  let geometry
  const dim = 32
  const positions = new Float32Array(dim * dim * dim)
  const effect = new MarchingCubes(dim, new MeshNormalMaterial(), false, false)
  effect.isolation = 0

  let n128, n64, n32, n16, n8, n4
  const fbm = (x, y, z) => {
    n128 = noise.noise3D(x / 128, y / 128, z / 128)
    n64 = noise.noise3D(x / 64, y / 64, z / 64)
    n32 = noise.noise3D(x / 32, y / 32, z / 32)
    n16 = noise.noise3D(x / 16, y / 16, z / 16)
    n8 = noise.noise3D(x / 8, y / 8, z / 8)
    n4 = noise.noise3D(x / 4, y / 4, z / 4)
    let value = 2 * (0.5 - Math.abs(n128)) * 0.5
    value += 2 * (0.5 - Math.abs(n64)) * 0.25
    value += 2 * (0.5 - Math.abs(n32)) * 0.125
    value += 2 * (0.5 - Math.abs(n16)) * 0.0625 * n128
    value += 2 * (0.5 - Math.abs(n8)) * 0.03125 * n64
    value += 2 * (0.5 - Math.abs(n4)) * 0.015625 * n32
    return value
  }
  let x1, y1, z1, x2, y2, z2
  for (let z = k * (dim - 3); z < k * (dim - 3) + dim; z++) {
    for (let y = j * (dim - 3); y < j * (dim - 3) + dim; y++) {
      for (let x = i * (dim - 3); x < i * (dim - 3) + dim; x++, n++) {
        x1 = x + 16 * fbm(x, y, z)
        y1 = y + 16 * fbm(x + 333.33, y + 333.33, z + 333.33)
        z1 = z + 16 * fbm(x + 666.66, y + 666.66, z + 666.66)
        x2 = x + 16 * fbm(x1, y1, z1)
        y2 = y + 16 * fbm(x1 + 111.11, y1 + 111.11, z1 + 111.11)
        z2 = z + 16 * fbm(x1 + 222.22, y1 + 222.22, z1 + 222.22)
        noiseValue = fbm(x2, y2, z2)

        let density = 0
        density += noiseValue * 0.5

        const zinfluence = 0.5 - z / (zMax * (dim - 3))
        density += zinfluence

        positions[n] = density

        if (n === 0) continue
        noGeometry = noGeometry ? Math.sign(positions[n]) === Math.sign(positions[n - 1]) : false
      }
    }
  }
  if (noGeometry) {
    postMessage({
      hasGeometry: false,
      i,
      j,
      k
    })
    return
  }
  // generate geometry
  effect.field = positions
  geometry = effect.generateBufferGeometry()

  if (!geometry.attributes.position) {
    postMessage({
      hasGeometry: false,
      i,
      j,
      k
    })
    return
  }

  geometry.computeBoundingBox()
  const scaleFactor = voxelSize / 1.8125
  geometry.scale(scaleFactor, scaleFactor, scaleFactor)

  geometry = new Geometry().fromBufferGeometry(geometry)
  geometry.mergeVertices()
  const geometry1 = simple.modify(
    geometry,
    Math.floor(geometry.vertices.length * (geometry.vertices.length > 200 ? 0.4 : 0.1))
  )
  // const geometry2 = simple.modify(geometry, Math.floor(geometry.vertices.length * 0.7))
  geometry1.computeVertexNormals()
  // geometry2.computeVertexNormals()
  // geometry.computeFaceNormals()
  // geometry = new BufferGeometry().fromGeometry(geometry)

  // geometry.computeVertexNormals()
  const pos1 = geometry1.attributes.position.array.buffer
  // const pos2 = geometry2.attributes.position.array.buffer
  const normals1 = geometry1.attributes.normal.array.buffer
  // const normals2 = geometry2.attributes.normal.array.buffer
  const index1 = geometry1.index.array.buffer
  // const index2 = geometry2.index.array.buffer
  console.timeEnd([i, j, k].toString())
  postMessage({
    hasGeometry: true,
    i,
    j,
    k,
    pos1,
    normals1,
    index1
    // pos2,
    // normals2,
    // index2
  }, [pos1, normals1, index1]) //, pos2, normals2, index2])
}

onmessage = function (args) {
  const [i, j, k, zMax] = args.data
  generateVoxels(i, j, k, zMax)
}
