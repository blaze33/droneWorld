/* eslint-env worker */

import SimplexNoise from 'simplex-noise'
import {MarchingCubes, SimplifyModifier} from '../modules'
import * as THREE from 'three'

const simple = new SimplifyModifier()
const noise = new SimplexNoise('123')

const generateVoxels = (i, j, k, zMax) => {
  console.time([i, j, k].toString())
  let n = 0
  let noGeometry = true
  let noiseValue
  let geometry
  let dim = 32
  const positions = new Float32Array(dim * dim * dim)
  const effect = new MarchingCubes(dim, new THREE.MeshNormalMaterial(), true, true)
  effect.isolation = 0

  for (let z = k * (dim - 3); z < k * (dim - 3) + dim; z++) {
    for (let y = j * (dim - 3); y < j * (dim - 3) + dim; y++) {
      for (let x = i * (dim - 3); x < i * (dim - 3) + dim; x++, n++) {
        noiseValue = noise.noise3D(x / 128, y / 128, z / 128) * 0.5
        noiseValue += noise.noise3D(x / 64, y / 64, z / 64) * 0.25
        // noiseValue += noise.noise3D(x / 32, y / 32, z / 32) * 0.125
        // noiseValue += noise.noise3D(x / 16, y / 16, z / 16) * 0.0625
        noiseValue += noise.noise3D(x / 8, y / 8, z / 8) * 0.03125
        noiseValue += noise.noise3D(x / 4, y / 4, z / 4) * 0.015625
        positions[n] = -(z - zMax * (dim - 3) / 2) / (zMax * (dim - 3)) + noiseValue * 0.5
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
  let scaleFactor = 100 / 1.8125
  geometry.scale(scaleFactor, scaleFactor, scaleFactor)

  geometry = new THREE.Geometry().fromBufferGeometry(geometry)
  geometry.mergeVertices()
  geometry.computeVertexNormals()
  // geometry.computeFaceNormals()
  // geometry = simple.modify(geometry, Math.floor(geometry.vertices.length * 0.5))
  geometry = new THREE.BufferGeometry().fromGeometry(geometry)

  // geometry.computeVertexNormals()

  const pos = geometry.attributes.position.array.buffer
  const normals = geometry.attributes.normal.array.buffer
  console.timeEnd([i, j, k].toString())
  postMessage({
    hasGeometry: true,
    i,
    j,
    k,
    pos,
    normals
  }, [pos, normals])
}

onmessage = function (args) {
  const [i, j, k, zMax] = args.data
  generateVoxels(i, j, k, zMax)
}
