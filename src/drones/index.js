import GLTFLoader from '../modules/GLTFLoader'
import PubSub from '../events'

var loader = new GLTFLoader()

let droneMesh

loader.load(
  // resource URL
  './assets/drone/scene.gltf',
  // called when the resource is loaded
  function (gltf) {
    droneMesh = gltf.scene.children[0]
    PubSub.publish('assets.drone.loaded', {mesh: droneMesh})
  }
)

export default droneMesh