import {TextureLoader, ShaderMaterial, Vector2, Vector3, MeshPhongMaterial, PlaneBufferGeometry, Mesh} from 'three'
import {Plane} from 'whs'
import {PNG} from 'pngjs'
import UPNG from 'upng-js'
import vertexShader from './shaders/terrain.vert'
import fragmentShader from './shaders/terrain.frag'
import whiteShader from './shaders/white.frag'
import identityShader from './shaders/white.vert'

const textureLoader = new TextureLoader().setCrossOrigin("anonymous")
const tilesElevationURL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const tilesNormalURL = 'https://s3.amazonaws.com/elevation-tiles-prod/normal'

const heightMapTexture = (z, x, y) => {
  const tileURL = `${tilesElevationURL}/${z}/${x}/${y}.png`
  return textureLoader.load(tileURL)
}

const spectralTexture = textureLoader.load(
  "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Spectral.png"
)

const terrainMaterial = (z, x, y, options, uniforms) => {
  return new ShaderMaterial({
    uniforms: {
      heightmap: {value: heightMapTexture(z, x, y)},
      spectral: {value: spectralTexture},
      ...uniforms
    },
    vertexShader,
    fragmentShader,
    extensions: {
      derivatives: true,
    },
    wireframe: true,
    ...options,
  });
}

const spectralMaterial = (options, uniforms) => {
  return new ShaderMaterial({
    uniforms: {
      spectral: {value: spectralTexture},
      ...uniforms
    },
    vertexShader: identityShader,
    fragmentShader: fragmentShader,
    extensions: {
      derivatives: true,
    },
    // wireframe: true,
    ...options,
  })
}
const spectralMaterialInstance = spectralMaterial()

// const wireMaterial = (z, x, y, options) => {
//   return new ShaderMaterial({
//     uniforms: {
//       ...heightMapUniform(z, x, y),
//       spectral: spectralTexture
//     },
//     vertexShader,
//     fragmentShader: whiteShader,
//     extensions: {
//       derivatives: true,
//     },
//     wireframe: true,
//     ...options,
//   });
// }

const tilePosition = (z, x, y, i, j, size) => {
  let position = new Vector3(
    (x - 330 ) * 800 + i * size + size / 2,
    -(y - 790) * 800 + j * size - 800 + size / 2,
    0
  )
  return position
}

const buildTile = (z, x, y, i, j, size, segments, terrainOptions) => {
  const position = tilePosition(z, x, y, i, j, size)
  const zxyTex = [z, x, y]
  const plane = new Plane({
    geometry: {
      width: size,
      height: size,
      wSegments: segments,
      hSegments: segments,
      buffer: true
    },
    position,
  })
  const material = terrainMaterial(...zxyTex, terrainOptions, {
    ijs: {value: new Vector3(i, j, size)},
    tileSize: {value: 800}
  })
  plane.material = material
  return plane
}

// ############################################
const tileSize = 800
const pngToHeight = (array) => {
  const heightmap = new Float32Array(256 * 256)
  for (let i=0; i<256;i++) {
    for (let j=0; j<256;j++) {
      const ij = i + 256 * j
      const rgba = ij * 4
      heightmap[ij] = array[rgba] * 256.0 + array[rgba + 1] + array[rgba + 2] / 256. - 32768.0
    }
  }
  return heightmap
}
console.log(UPNG)
const heightmap = (z, x, y) => {
  const tileURL = `${tilesElevationURL}/${z}/${x}/${y}.png`
  return window.fetch(tileURL)
    .then(res => res.arrayBuffer())
    .then(array => new Uint8Array(UPNG.toRGBA8(UPNG.decode(array))[0]))
    .then(png => {
      png.heightmap = pngToHeight(png)
      return png
    })
}
window.heightmap = heightmap

// cf. http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
const long2tile = (lon,zoom) => {
  return (lon+180)/360*Math.pow(2,zoom)
}
const lat2tile = (lat,zoom) => {
  return (
    (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)
  )
}
const offset = {y: 45.8671, x: 7.3087}
const chamonix = {x: long2tile(offset.x, 10), y: lat2tile(offset.y, 10)}
const offsetAtZ = (z) => {
  return {
    x: chamonix.x / Math.pow(2, 10 - z),
    y: chamonix.y / Math.pow(2, 10 - z),
  }
}

const buildPlane = (z, x, y, segments, j, size) => {
  const geometry = new PlaneBufferGeometry( size, size, segments, segments);
  const plane = new Mesh( geometry, spectralMaterialInstance );
  plane.geometry.attributes.position.dynamic = true

  const offset = offsetAtZ(z)
  plane.translateX(x * size - (offset.x%1 - 0.5) * size + (chamonix.x-0.5)%1*800)
  plane.translateY(-y * size + (offset.y%1 - 0.5) * size - (chamonix.y-0.5)%1*800)

  const fetchedX = Math.floor(x + offset.x)
  const fetchedY = Math.floor(y + offset.y)
  if (x==0 && y==0) {console.log("offset", z, offset)}
  plane.png = heightmap(z, fetchedX, fetchedY).then(parsedPng => {
    plane.png = parsedPng
    setHeightmap(plane, plane.png.heightmap, 0.1, 0)
  });
  return plane
}

const setHeightmap = (plane, heightmap, scale, offset) => {
  if (!plane.geometry) {return}
  const nPosition = plane.geometry.parameters.heightSegments + 1
  const nHeightmap = Math.sqrt(plane.png.heightmap.length)
  const ratio = nHeightmap / nPosition
  let x, y
  for (let i=0;i<plane.geometry.attributes.position.count;i++) {
    x = Math.floor(i / nPosition)
    y = i % nPosition
    plane.geometry.attributes.position.setZ(i, heightmap[x * ratio * nHeightmap + Math.floor(y * ratio) - offset] * scale)
  }
  plane.geometry.attributes.position.needsUpdate = true
  plane.geometry.computeVertexNormals()
}

export {
    heightMapTexture,
    spectralTexture,
    buildTile,
    heightmap,
    spectralMaterial,
    buildPlane,
}