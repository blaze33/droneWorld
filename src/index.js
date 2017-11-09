import './index.css'
import * as THREE from 'three';
import * as WHS from 'whs'
import Alea from 'alea'
// import './modules/terrain.js'
import FlyControls from './modules/FlyControls'
import SimplexNoise from './modules/simplexNoise'
import keyboardJS from 'keyboardjs'

const cameraModule = new WHS.DefineModule(
  'camera',
  new WHS.PerspectiveCamera({ // Apply a camera.
    position: new THREE.Vector3(0, 10, 50)
  })
)
const fogModule = new WHS.FogModule({
  color: 0xffffff,
  density: 0.03,
  near: 20,
  far: 200
}, 'exp2');

const flyModule = new WHS.ControlsModule.from(new FlyControls(cameraModule.data.native))
const orbitModule = new WHS.OrbitControlsModule()
let controlsModule = orbitModule

window.WHS = WHS
window.THREE = THREE
window.cameraModule = cameraModule
window.SimplexNoise = SimplexNoise

const app = new WHS.App([
  new WHS.ElementModule({
    container: document.getElementById('root')
  }),
  new WHS.SceneModule(),
  cameraModule,
  new WHS.RenderingModule({
    bgColor: 0x162129,

    renderer: {
      antialias: true,
      shadowmap: {
        type: THREE.PCFSoftShadowMap
      }
    }
  }, {shadow: true}),
  // fogModule,
  controlsModule,
  new WHS.ResizeModule()
]);
window.app = app
// Sphere
// const sphere = new WHS.Sphere({ // Create sphere comonent.
//   geometry: {
//     radius: 5,
//     widthSegments: 32,
//     heightSegments: 32
//   },

//   material: new THREE.MeshPhongMaterial({
//     color: 0xF2F2F2
//   }),

//   position: new THREE.Vector3(0, 5, 0)
// });

// sphere.addTo(app);

// Plane
const plane = new WHS.Plane({
  geometry: {
    width: 100,
    height: 100,
    wSegments: 256,
    hSegments: 256,
    buffer: true
  },

  material: new THREE.MeshPhongMaterial({color: 0x447F8B, wireframe: true}),

  rotation: {
    x: -Math.PI / 2
  }
})

function getImageData( image ) {
    var canvas = document.createElement( 'canvas' );
    canvas.width = image.width;
    canvas.height = image.height;

    var context = canvas.getContext( '2d' );
    context.drawImage( image, 0, 0 );

    return context.getImageData( 0, 0, image.width, image.height );
}

function getPixel( imagedata, x, y ) {
    var position = ( x + imagedata.width * y ) * 4, data = imagedata.data;
    return { r: data[ position ], g: data[ position + 1 ], b: data[ position + 2 ], a: data[ position + 3 ] };
}


const noise = new SimplexNoise(new Alea(333))
const planeGeometry = plane.native.geometry
// planeGeometry.vertices = planeGeometry.vertices.map(p => {
//   return {
//     x: p.x,
//     y: p.y,
//     z: (
//       noise.noise2D(p.x / 50, p.y / 50) * 20 +
//       noise.noise2D(p.x / 20, p.y / 20) / 2 +
//       noise.noise2D(p.x / 5, p.y / 5)
//     ) / ((Math.abs(p.x) + Math.abs(p.y) + 20) / 20)
//   }
// })
let imagedata
window.data = imagedata
new THREE.TextureLoader()
  .setCrossOrigin("anonymous")
  .load(
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/11/330/791.png",
    texture => { imagedata = getImageData( texture.image ); updateTerrain()}
  );
const getHeight = (x, y) => {
  const color = getPixel(imagedata, x, y)
  return (color.r * 256 + color.g + color.b / 256) - 32768
}
const updateTerrain = () => {
  planeGeometry.vertices.forEach(p => {
    p.set(
      p.x,
      p.y,
      (
        getHeight((p.x + 50) * 256 / 100, (p.y + 50) * 256 / 100) - 300
      ) / 50
    )
  })
  planeGeometry.verticesNeedUpdate = true
  console.log(planeGeometry.verticesNeedUpdate)
  planeGeometry.verticesNeedUpdate = true
}

plane.addTo(app);

// Lights
new WHS.PointLight({
  light: {
    intensity: 1,
    distance: 100
  },

  shadow: {
    fov: 90
  },

  position: new THREE.Vector3(0, 10, 20)
}).addTo(app);

new WHS.AmbientLight({
  light: {
    intensity: 0.4
  }
}).addTo(app);

new WHS.HemisphereLight({
  skyColor: 0xff0000,
  groundColor: 0x0000ff,
  intensity: 0.2
}).addTo(app);

// Start the app
app.start();

keyboardJS.bind('p', e => {
  app.disposeModule(controlsModule)
  console.log("disposed", controlsModule)
  controlsModule = controlsModule === orbitModule ? flyModule : orbitModule
  app.applyModule(controlsModule)
  console.log("apply", controlsModule)
})
// keyboardJS.watch()


