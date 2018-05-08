import {
  TextureLoader,
  Color,
  AdditiveBlending
} from 'three'
import {
    Lensflare,
    LensflareElement
} from '../modules/Lensflare'

const textureLoader = new TextureLoader()

const textureFlare0 = textureLoader.load(require('../textures/lensflare/lensflare0.png'))
const textureFlare2 = textureLoader.load(require('../textures/lensflare/lensflare2.png'))
const textureFlare3 = textureLoader.load(require('../textures/lensflare/lensflare3.png'))

const flareColor = new Color(0xffffff)
// flareColor.setHSL( h, s, l + 0.5 );

const lensFlare = new Lensflare(textureFlare0, 350, 0.0, AdditiveBlending, flareColor)
console.log(lensFlare)
lensFlare.addElement(new LensflareElement(textureFlare2, 512, 0.0))
lensFlare.addElement(new LensflareElement(textureFlare2, 512, 0.0))
lensFlare.addElement(new LensflareElement(textureFlare2, 512, 0.0))

lensFlare.addElement(new LensflareElement(textureFlare3, 60, 0.6))
lensFlare.addElement(new LensflareElement(textureFlare3, 70, 0.7))
lensFlare.addElement(new LensflareElement(textureFlare3, 120, 0.9))
lensFlare.addElement(new LensflareElement(textureFlare3, 70, 1.0))

export default lensFlare
