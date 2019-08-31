import {
  MeshDepthMaterial,
  UniformsUtils,
  Vector2
} from 'three'
import {
  EffectComposer,
  RenderPass,
  BokehShader,
  ShaderPass
} from '../modules'

const effectController = {
  shaderFocus: true,

  fstop: 3.0,
  maxblur: 3.0,

  showFocus: false,
  focalDepth: 130,
  manualdof: false,
  vignetting: false,
  depthblur: false,

  threshold: 0.5,
  gain: 2.0,
  bias: 0.5,
  fringe: 0.7,

  focalLength: 15,
  noise: true,
  pentagon: false,

  dithering: 0.0001

}

const initDoF = (scene, renderer, camera, gui) => {
  // depthmap is rendered to a first buffer
  var composerDepth = new EffectComposer(renderer)
  var renderPassDepth = new RenderPass(scene, camera)
  renderPassDepth.overrideMaterial = new MeshDepthMaterial()
  composerDepth.addPass(renderPassDepth)

  // default rendering pass
  var composer = new EffectComposer(renderer)
  var renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  // bokeh shader definition
  const bokeh = {}
  bokeh.uniforms = UniformsUtils.clone(BokehShader.uniforms)
  bokeh.vertexShader = BokehShader.vertexShader
  bokeh.fragmentShader = BokehShader.fragmentShader
  bokeh.uniforms.focusCoords = { value: new Vector2(0.5, 0.5) }
  bokeh.uniforms.textureWidth = { value: window.innerWidth }
  bokeh.uniforms.textureHeight = { value: window.innerHeight }
  bokeh.defines = {
    RINGS: 3,
    SAMPLES: 3
  }

  // depth of field pass
  var shaderPass = new ShaderPass(bokeh, 'tColor')
  shaderPass.renderToScreen = true
  composer.addPass(shaderPass)

  if (gui) {
    var matChanger = function () {
      for (var e in effectController) {
        if (e in shaderPass.uniforms) { shaderPass.uniforms[e].value = effectController[e] }
      }

      shaderPass.uniforms.znear.value = camera.near
      shaderPass.uniforms.zfar.value = camera.far
      camera.setFocalLength(effectController.focalLength)
    }

    const folder = gui.addFolder('Depth of Field')

    // folder.add( effectController, "shaderFocus" ).onChange( matChanger );
    // folder.add( effectController, "focalDepth", 0.0, 500.0 ).listen().onChange( matChanger );

    folder.add(effectController, 'fstop', 0.1, 10, 0.001).onChange(matChanger)
    folder.add(effectController, 'maxblur', 0.0, 5.0, 0.025).onChange(matChanger)

    folder.add(effectController, 'showFocus').onChange(matChanger)
    // folder.add( effectController, "manualdof" ).onChange( matChanger );
    folder.add(effectController, 'vignetting').onChange(matChanger)

    // folder.add( effectController, "depthblur" ).onChange( matChanger );

    folder.add(effectController, 'threshold', 0, 1, 0.001).onChange(matChanger)
    folder.add(effectController, 'gain', 0, 100, 0.001).onChange(matChanger)
    folder.add(effectController, 'bias', 0, 3, 0.001).onChange(matChanger)
    folder.add(effectController, 'fringe', 0, 5, 0.001).onChange(matChanger)

    folder.add(effectController, 'focalLength', 16, 80, 0.001).onChange(matChanger)

    // folder.add( effectController, "noise" ).onChange( matChanger );

    // folder.add( effectController, "dithering", 0, 0.001, 0.0001 ).onChange( matChanger );

    // folder.add( effectController, "pentagon" ).onChange( matChanger );

    matChanger()
  }

  return {
    composerDepth,
    //  in the main loop renderDepth must be called before composer.render()
    renderDepth: () => {
      composerDepth.render()
      shaderPass.uniforms.tDepth.value = composerDepth.renderTarget2.texture
    },
    composer
  }
}

export default initDoF
