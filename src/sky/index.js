import {
  Mesh,
  // SphereBufferGeometry,
  SphereGeometry,
  MeshBasicMaterial,
  BackSide
} from 'three'
import { Sky } from '../modules/Sky'
import { dirLight } from '../lights'

function initSky (scene, sunPosition, gui) {
  // Add Sky
  const sky = new Sky()
  sky.scale.setScalar(450000)
  scene.add(sky)

  // Add Sun Helper
  // const sunSphere = new Mesh(
  //     new SphereBufferGeometry( 20000, 16, 8 ),
  //     new MeshBasicMaterial( { color: 0xffffff } )
  // );
  // sunSphere.position.y = - 700000;
  // sunSphere.visible = false;
  // scene.add( sunSphere );

  var skyGeo = new SphereGeometry(1e5, 8, 8)
  // flip faces so that overrideMaterial MeshDepthMatrial renders the skydome
  // cf. https://stackoverflow.com/a/21485105/343834
  for (let i = 0; i < skyGeo.faces.length; i++) {
    const face = skyGeo.faces[i]
    const temp = face.a
    face.a = face.c
    face.c = temp
  }
  var material = new MeshBasicMaterial({
    opacity: 0
  })
  var skyDome = new Mesh(skyGeo, material)
  skyDome.material.side = BackSide
  scene.add(skyDome)

  /// GUI

  var effectController = {
    turbidity: 10,
    rayleigh: 2,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    luminance: 1,
    inclination: 0.32, // elevation / inclination
    azimuth: 0.2, // Facing front,
    sun: !true
  }

  if (gui) {
    var distance = 400000
    function guiChanged () { // eslint-disable-line
      var uniforms = sky.material.uniforms
      uniforms.turbidity.value = effectController.turbidity
      uniforms.rayleigh.value = effectController.rayleigh
      uniforms.luminance.value = effectController.luminance
      uniforms.mieCoefficient.value = effectController.mieCoefficient
      uniforms.mieDirectionalG.value = effectController.mieDirectionalG

      var theta = Math.PI * (effectController.inclination - 0.5)
      var phi = 2 * Math.PI * (effectController.azimuth - 0.5)

      sunPosition.x = distance * Math.cos(phi)
      sunPosition.z = distance * Math.sin(phi) * Math.sin(theta)
      sunPosition.y = distance * Math.sin(phi) * Math.cos(theta)

      // sunSphere.visible = effectController.sun;

      uniforms.sunPosition.value.copy(sunPosition)
      sunPosition.copy(sunPosition)

      dirLight.position.copy(sunPosition)
      dirLight.position.normalize()
      dirLight.position.multiplyScalar(2000.0)
    }

    const folder = gui.addFolder('Sun, sky and ocean')
    folder.add(effectController, 'turbidity', 1.0, 20.0, 0.1).onChange(guiChanged)
    folder.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged)
    folder.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged)
    folder.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged)
    folder.add(effectController, 'luminance', 0.0, 2).onChange(guiChanged)
    folder.add(effectController, 'inclination', 0, 1, 0.0001).onChange(guiChanged)
    folder.add(effectController, 'azimuth', 0, 1, 0.0001).onChange(guiChanged)
    folder.add(effectController, 'sun').onChange(guiChanged)

    guiChanged()
  }

  return sky
}

export { initSky }
