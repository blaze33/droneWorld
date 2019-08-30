import { MeshBasicMaterial } from 'three'
import { MaskPass } from 'three/examples/jsm/postprocessing/MaskPass.js'

var MaskPass2 = function (scene, camera, mask) {
  MaskPass.call(this, scene, camera)

  this.initialMask = null
  this.appliedMask = mask
  this.material = new MeshBasicMaterial()
}

MaskPass2.prototype = MaskPass.prototype
MaskPass2.prototype.constructor = MaskPass2

const maskRender = MaskPass2.prototype.render
MaskPass2.prototype.render = function (renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
  this.initialMask = this.camera.layers.mask
  this.camera.layers.mask = this.appliedMask
  this.scene.overrideMaterial = this.material

  maskRender.call(this, renderer, writeBuffer, readBuffer)

  this.scene.overrideMaterial = null
  this.camera.layers.mask = this.initialMask
}

export { MaskPass2 }
