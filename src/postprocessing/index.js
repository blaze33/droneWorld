import BokehShader from './BokehShader2'
import CopyShader from './CopyShader'
import EffectComposer from './EffectComposer'
import {MaskPass, ClearMaskPass} from './MaskPass'
import Pass from './Pass'
import ShaderPass from './ShaderPass'
import RenderPass from './RenderPass'

import initDoF from './dof'
import lensFlare from './lensflares'

import {motionBlurShader} from './MotionBlur'

export {
  BokehShader,
  CopyShader,
  EffectComposer,
  MaskPass,
  ClearMaskPass,
  Pass,
  RenderPass,
  ShaderPass,

  initDoF,
  lensFlare,

  motionBlurShader
}
