import {
  TextureLoader,
  Color,
  LensFlare,
  AdditiveBlending,
} from 'three'

const textureLoader = new TextureLoader();

const textureFlare0 = textureLoader.load(require('../textures/lensflare/lensflare0.png'))
const textureFlare2 = textureLoader.load(require('../textures/lensflare/lensflare2.png'))
const textureFlare3 = textureLoader.load(require('../textures/lensflare/lensflare3.png'))


const flareColor = new Color( 0xffffff );
// flareColor.setHSL( h, s, l + 0.5 );

const lensFlare = new LensFlare( textureFlare0, 350, 0.0, AdditiveBlending, flareColor );

lensFlare.add( textureFlare2, 512, 0.0, AdditiveBlending );
lensFlare.add( textureFlare2, 512, 0.0, AdditiveBlending );
lensFlare.add( textureFlare2, 512, 0.0, AdditiveBlending );

lensFlare.add( textureFlare3, 60, 0.6, AdditiveBlending );
lensFlare.add( textureFlare3, 70, 0.7, AdditiveBlending );
lensFlare.add( textureFlare3, 120, 0.9, AdditiveBlending );
lensFlare.add( textureFlare3, 70, 1.0, AdditiveBlending );

export default lensFlare