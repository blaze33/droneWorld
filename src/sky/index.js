import {
  Mesh,
  SphereBufferGeometry,
  MeshBasicMaterial,
} from 'three'
import {Sky} from '../modules/Sky'
import {dirLight} from '../lights'

function initSky(scene, gui, sunPosition) {

  // Add Sky
  const sky = new Sky();
  sky.scale.setScalar( 450000 );
  scene.add( sky );

  // Add Sun Helper
  const sunSphere = new Mesh(
      new SphereBufferGeometry( 20000, 16, 8 ),
      new MeshBasicMaterial( { color: 0xffffff } )
  );
  sunSphere.position.y = - 700000;
  sunSphere.visible = false;
  scene.add( sunSphere );

  /// GUI

  var effectController  = {
      turbidity: 10,
      rayleigh: 2,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      luminance: 1,
      inclination: 0.32, // elevation / inclination
      azimuth: 0.2, // Facing front,
      sun: ! true
  };

  var distance = 400000;

  function guiChanged() {

      var uniforms = sky.material.uniforms;
      uniforms.turbidity.value = effectController.turbidity;
      uniforms.rayleigh.value = effectController.rayleigh;
      uniforms.luminance.value = effectController.luminance;
      uniforms.mieCoefficient.value = effectController.mieCoefficient;
      uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

      var theta = Math.PI * ( effectController.inclination - 0.5 );
      var phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

      sunSphere.position.x = distance * Math.cos( phi );
      sunSphere.position.z = distance * Math.sin( phi ) * Math.sin( theta );
      sunSphere.position.y = distance * Math.sin( phi ) * Math.cos( theta );

      sunSphere.visible = effectController.sun;

      uniforms.sunPosition.value.copy( sunSphere.position );
      sunPosition.copy(sunSphere.position)

      dirLight.position.copy(sunPosition)
      dirLight.position.normalize()
      dirLight.position.multiplyScalar(2000.0)

  }

  gui.add( effectController, "turbidity", 1.0, 20.0, 0.1 ).onChange( guiChanged );
  gui.add( effectController, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "luminance", 0.0, 2 ).onChange( guiChanged );
  gui.add( effectController, "inclination", 0, 1, 0.0001 ).onChange( guiChanged );
  gui.add( effectController, "azimuth", 0, 1, 0.0001 ).onChange( guiChanged );
  gui.add( effectController, "sun" ).onChange( guiChanged );

  guiChanged();

}

export {initSky}