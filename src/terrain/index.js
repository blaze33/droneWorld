import {TextureLoader, ShaderMaterial, Vector3} from 'three'
import {Plane} from 'whs'
import vertexShader from './shaders/terrain.vert'
import fragmentShader from './shaders/terrain.frag'

const textureLoader = new TextureLoader().setCrossOrigin("anonymous")
const tilesElevationURL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const tilesNormalURL = 'https://s3.amazonaws.com/elevation-tiles-prod/normal'

const heightMapTexture = (z, x, y) => {
  const tileURL = `${tilesElevationURL}/${z}/${x}/${y}.png`
  return textureLoader.load(tileURL)
}

const spectralTex = {
  type: 't',
  value: textureLoader.load("https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Spectral.png")
}

const heightMapUniform = (z, x, y) => {
  return {
    heightmap: {
      type: 't',
      value: heightMapTexture(z, x, y)
    }
  }
}

const terrainMaterial = (z, x, y, options) => {
  return new ShaderMaterial({
    uniforms: {
      ...heightMapUniform(z, x, y),
      spectral: spectralTex
    },
    vertexShader,
    fragmentShader,
    extensions: {
      derivatives: true,
    },
    ...options,
  });
}

const buildTile = (app, z, x, y, terrainOptions) => {
  const tileSize = 100 * (12 - z)
  let position
  if (z === '11') {
    position = new Vector3(
      (x - 330) * tileSize - tileSize / 2,
      -(y - 790) * tileSize + tileSize / 2,
      0
    )
  } else if (z === '10') {
    position = new Vector3(
      (x - 330 / 2) * tileSize,
      -(y - 790 / 2) * tileSize,
      0
    )
  }
  return new Plane({
    geometry: {
      width: tileSize,
      height: tileSize,
      wSegments: 100,
      hSegments: 100,
      buffer: true
    },

    material: terrainMaterial(z, x, y, terrainOptions),

    // rotation: {
    //   x: -Math.PI / 2
    // },
    position,
  })
}

export {
    heightMapTexture,
    heightMapUniform,
    spectralTex,
    buildTile,
}