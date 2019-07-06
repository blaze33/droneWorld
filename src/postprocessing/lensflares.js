import {
  TextureLoader
} from 'three'
import {
  Lensflare,
  LensflareElement
} from '../modules'

const textureLoader = new TextureLoader()
const textureFlare3 = textureLoader.load(require('../textures/lensflare/lensflare3.png'))

const lensFlare = new Lensflare()

lensFlare.addElement(new LensflareElement(textureFlare3, 60, 0.6))
lensFlare.addElement(new LensflareElement(textureFlare3, 70, 0.7))
lensFlare.addElement(new LensflareElement(textureFlare3, 120, 0.9))
lensFlare.addElement(new LensflareElement(textureFlare3, 70, 1.0))

export default lensFlare
