import {GLTFLoader} from '../modules'
import PubSub from '../events'

var loader = new GLTFLoader()

let droneMesh

const loadDroneAssets = () => {
  loader.load(
    // resource URL
    './assets/drone/scene.gltf',
    // called when the resource is loaded
    function (gltf) {
      droneMesh = gltf.scene.children[0]
      console.log(droneMesh)
      PubSub.publish('x.assets.drone.loaded', {mesh: droneMesh})
    }
  )
}

export default loadDroneAssets
