import {TextureLoader, ShaderMaterial, Vector2, Vector3, MeshPhongMaterial} from 'three'
import {Plane} from 'whs'
import vertexShader from './shaders/terrain.vert'
import fragmentShader from './shaders/terrain.frag'
import whiteShader from './shaders/white.frag'

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
    // wireframe: true,
    ...options,
  });
}

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
    (x - 330 /4) * 800 + i * size + size / 2,
    -(y - 790/4) * 800 + j * size - 800 + size / 2,
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

export {
    heightMapTexture,
    spectralTexture,
    buildTile,
}