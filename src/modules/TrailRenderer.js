/**
* @author Mark Kellogg - http://www.github.com/mkkellogg
*/

// =======================================
// Trail Renderer
// =======================================

import {
    Object3D,
    Vector3,
    Vector4,
    ShaderMaterial,
    CustomBlending,
    SrcAlphaFactor,
    OneMinusSrcAlphaFactor,
    AddEquation,
    DoubleSide,
    Vector2,
    BufferGeometry,
    BufferAttribute,
    Mesh,
    Matrix4,
    Quaternion,
    Matrix3
} from 'three'

const TrailRenderer = function (scene, orientToMovement) {
  Object3D.call(this)

  this.active = false

  this.orientToMovement = false
  if (orientToMovement) this.orientToMovement = true

  this.scene = scene

  this.geometry = null
  this.mesh = null
  this.nodeCenters = null

  this.lastNodeCenter = null
  this.currentNodeCenter = null
  this.lastOrientationDir = null
  this.nodeIDs = null
  this.currentLength = 0
  this.currentEnd = 0
  this.currentNodeID = 0
}

TrailRenderer.prototype = Object.create(Object3D.prototype)
TrailRenderer.prototype.constructor = TrailRenderer

TrailRenderer.MaxHeadVertices = 128
TrailRenderer.LocalOrientationTangent = new Vector3(1, 0, 0)
TrailRenderer.LocalOrientationDirection = new Vector3(0, 0, -1)
TrailRenderer.LocalHeadOrigin = new Vector3(0, 0, 0)
TrailRenderer.PositionComponentCount = 3
TrailRenderer.UVComponentCount = 2
TrailRenderer.IndicesPerFace = 3
TrailRenderer.FacesPerQuad = 2

TrailRenderer.Shader = {}

TrailRenderer.Shader.BaseVertexVars = [

  'attribute float nodeID;',
  'attribute float nodeVertexID;',
  'attribute vec3 nodeCenter;',

  'uniform float minID;',
  'uniform float maxID;',
  'uniform float trailLength;',
  'uniform float maxTrailLength;',
  'uniform float verticesPerNode;',
  'uniform vec2 textureTileFactor;',

  'uniform vec4 headColor;',
  'uniform vec4 tailColor;',

  'varying vec4 vColor;'

].join('\n')

TrailRenderer.Shader.TexturedVertexVars = [

  TrailRenderer.Shader.BaseVertexVars,
  'varying vec2 vUV;',
  'uniform float dragTexture;'

].join('\n')

TrailRenderer.Shader.BaseFragmentVars = [

  'varying vec4 vColor;',
  'uniform sampler2D texture;'

].join('\n')

TrailRenderer.Shader.TexturedFragmentVars = [

  TrailRenderer.Shader.BaseFragmentVars,
  'varying vec2 vUV;'

].join('\n')

TrailRenderer.Shader.VertexShaderCore = [

  'float fraction = ( maxID - nodeID ) / ( maxID - minID );',
  'vColor = ( 1.0 - fraction ) * headColor + fraction * tailColor;',
  'vec4 realPosition = vec4( ( 1.0 - fraction ) * position.xyz + fraction * nodeCenter.xyz, 1.0 ); '

].join('\n')

TrailRenderer.Shader.BaseVertexShader = [

  TrailRenderer.Shader.BaseVertexVars,

  'void main() { ',

  TrailRenderer.Shader.VertexShaderCore,
  'gl_Position = projectionMatrix * viewMatrix * realPosition;',

  '}'

].join('\n')

TrailRenderer.Shader.BaseFragmentShader = [

  TrailRenderer.Shader.BaseFragmentVars,

  'void main() { ',

  'gl_FragColor = vColor;',

  '}'

].join('\n')

TrailRenderer.Shader.TexturedVertexShader = [

  TrailRenderer.Shader.TexturedVertexVars,

  'void main() { ',

  TrailRenderer.Shader.VertexShaderCore,
  'float s = 0.0;',
  'float t = 0.0;',
  'if ( dragTexture == 1.0 ) { ',
  '   s = fraction *  textureTileFactor.s; ',
  '   t = ( nodeVertexID / verticesPerNode ) * textureTileFactor.t;',
  '} else { ',
  '   s = nodeID / maxTrailLength * textureTileFactor.s;',
  '   t = ( nodeVertexID / verticesPerNode ) * textureTileFactor.t;',
  '}',
  'vUV = vec2( s, t ); ',
  'gl_Position = projectionMatrix * viewMatrix * realPosition;',

  '}'

].join('\n')

TrailRenderer.Shader.TexturedFragmentShader = [

  TrailRenderer.Shader.TexturedFragmentVars,

  'void main() { ',

  'vec4 textureColor = texture2D( texture, vUV );',
  'gl_FragColor = vColor * textureColor;',

  '}'

].join('\n')

TrailRenderer.createMaterial = function (vertexShader, fragmentShader, customUniforms) {
  customUniforms = customUniforms || {}

  customUniforms.trailLength = { type: 'f', value: null }
  customUniforms.verticesPerNode = { type: 'f', value: null }
  customUniforms.minID = { type: 'f', value: null }
  customUniforms.maxID = { type: 'f', value: null }
  customUniforms.dragTexture = { type: 'f', value: null }
  customUniforms.maxTrailLength = { type: 'f', value: null }
  customUniforms.textureTileFactor = { type: 'v2', value: null }

  customUniforms.headColor = { type: 'v4', value: new Vector4() }
  customUniforms.tailColor = { type: 'v4', value: new Vector4() }

  vertexShader = vertexShader || TrailRenderer.Shader.BaseVertexShader
  fragmentShader = fragmentShader || TrailRenderer.Shader.BaseFragmentShader

  return new ShaderMaterial(
    {
      uniforms: customUniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,

      transparent: true,
      alphaTest: 0.5,
      opacity: 0.5,

      blending: CustomBlending,
      blendSrc: SrcAlphaFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendEquation: AddEquation,

      depthTest: true,
        // depthWrite: false,

        // side: DoubleSide,
      wireframe: false
    })
}

TrailRenderer.createBaseMaterial = function (customUniforms) {
  return this.createMaterial(TrailRenderer.Shader.BaseVertexShader, TrailRenderer.Shader.BaseFragmentShader, customUniforms)
}

TrailRenderer.createTexturedMaterial = function (customUniforms) {
  customUniforms = {}
  customUniforms.texture = { type: 't', value: null }

  return this.createMaterial(TrailRenderer.Shader.TexturedVertexShader, TrailRenderer.Shader.TexturedFragmentShader, customUniforms)
}

TrailRenderer.prototype.initialize = function (material, length, dragTexture, localHeadWidth, localHeadGeometry, targetObject) {
  this.deactivate()
  this.destroyMesh()

  this.length = (length > 0) ? length + 1 : 0
  this.dragTexture = (!dragTexture) ? 0 : 1
  this.targetObject = targetObject

  this.initializeLocalHeadGeometry(localHeadWidth, localHeadGeometry)

  this.nodeIDs = []
  this.nodeCenters = []

  for (var i = 0; i < this.length; i++) {
    this.nodeIDs[ i ] = -1
    this.nodeCenters[ i ] = new Vector3()
  }

  this.material = material

  this.initializeGeometry()
  this.initializeMesh()

  this.material.uniforms.trailLength.value = 0
  this.material.uniforms.minID.value = 0
  this.material.uniforms.maxID.value = 0
  this.material.uniforms.dragTexture.value = this.dragTexture
  this.material.uniforms.maxTrailLength.value = this.length
  this.material.uniforms.verticesPerNode.value = this.VerticesPerNode
  this.material.uniforms.textureTileFactor.value = new Vector2(1.0, 1.0)

  this.reset()
}

TrailRenderer.prototype.initializeLocalHeadGeometry = function (localHeadWidth, localHeadGeometry) {
  this.localHeadGeometry = []

  if (!localHeadGeometry) {
    var halfWidth = localHeadWidth || 1.0
    halfWidth = halfWidth / 2.0

    this.localHeadGeometry.push(new Vector3(-halfWidth, 0, 0))
    this.localHeadGeometry.push(new Vector3(halfWidth, 0, 0))

    this.VerticesPerNode = 2
  } else {
    this.VerticesPerNode = 0
    for (var i = 0; i < localHeadGeometry.length && i < TrailRenderer.MaxHeadVertices; i++) {
      var vertex = localHeadGeometry[ i ]

      if (vertex && vertex instanceof Vector3) {
        var vertexCopy = new Vector3()

        vertexCopy.copy(vertex)

        this.localHeadGeometry.push(vertexCopy)
        this.VerticesPerNode ++
      }
    }
  }

  this.FacesPerNode = (this.VerticesPerNode - 1) * 2
  this.FaceIndicesPerNode = this.FacesPerNode * 3
}

TrailRenderer.prototype.initializeGeometry = function () {
  this.vertexCount = this.length * this.VerticesPerNode
  this.faceCount = this.length * this.FacesPerNode

  var geometry = new BufferGeometry()

  var nodeIDs = new Float32Array(this.vertexCount)
  var nodeVertexIDs = new Float32Array(this.vertexCount * this.VerticesPerNode)
  var positions = new Float32Array(this.vertexCount * TrailRenderer.PositionComponentCount)
  var nodeCenters = new Float32Array(this.vertexCount * TrailRenderer.PositionComponentCount)
  var uvs = new Float32Array(this.vertexCount * TrailRenderer.UVComponentCount)
  var indices = new Uint32Array(this.faceCount * TrailRenderer.IndicesPerFace)

  var nodeIDAttribute = new BufferAttribute(nodeIDs, 1)
  nodeIDAttribute.setDynamic(true)
  geometry.addAttribute('nodeID', nodeIDAttribute)

  var nodeVertexIDAttribute = new BufferAttribute(nodeVertexIDs, 1)
  nodeVertexIDAttribute.setDynamic(true)
  geometry.addAttribute('nodeVertexID', nodeVertexIDAttribute)

  var nodeCenterAttribute = new BufferAttribute(nodeCenters, TrailRenderer.PositionComponentCount)
  nodeCenterAttribute.setDynamic(true)
  geometry.addAttribute('nodeCenter', nodeCenterAttribute)

  var positionAttribute = new BufferAttribute(positions, TrailRenderer.PositionComponentCount)
  positionAttribute.setDynamic(true)
  geometry.addAttribute('position', positionAttribute)

  var uvAttribute = new BufferAttribute(uvs, TrailRenderer.UVComponentCount)
  uvAttribute.setDynamic(true)
  geometry.addAttribute('uv', uvAttribute)

  var indexAttribute = new BufferAttribute(indices, 1)
  indexAttribute.setDynamic(true)
  geometry.setIndex(indexAttribute)

  this.geometry = geometry
}

TrailRenderer.prototype.zeroVertices = function () {
  var positions = this.geometry.getAttribute('position')

  for (var i = 0; i < this.vertexCount; i++) {
    var index = i * 3

    positions.array[ index ] = 0
    positions.array[ index + 1 ] = 0
    positions.array[ index + 2 ] = 0
  }

  positions.needsUpdate = true
  positions.updateRange.count = -1
}

TrailRenderer.prototype.zeroIndices = function () {
  var indices = this.geometry.getIndex()

  for (var i = 0; i < this.faceCount; i++) {
    var index = i * 3

    indices.array[ index ] = 0
    indices.array[ index + 1 ] = 0
    indices.array[ index + 2 ] = 0
  }

  indices.needsUpdate = true
  indices.updateRange.count = -1
}

TrailRenderer.prototype.formInitialFaces = function () {
  this.zeroIndices()

  var indices = this.geometry.getIndex()

  for (var i = 0; i < this.length - 1; i++) {
    this.connectNodes(i, i + 1)
  }

  indices.needsUpdate = true
  indices.updateRange.count = -1
}

TrailRenderer.prototype.initializeMesh = function () {
  this.mesh = new Mesh(this.geometry, this.material)
  this.mesh.dynamic = true
  this.mesh.matrixAutoUpdate = false
}

TrailRenderer.prototype.destroyMesh = function () {
  if (this.mesh) {
    this.scene.remove(this.mesh)
    this.mesh = null
  }
}

TrailRenderer.prototype.reset = function () {
  this.currentLength = 0
  this.currentEnd = -1

  this.lastNodeCenter = null
  this.currentNodeCenter = null
  this.lastOrientationDir = null

  this.currentNodeID = 0

  this.formInitialFaces()
  this.zeroVertices()

  this.geometry.setDrawRange(0, 0)
}

TrailRenderer.prototype.updateUniforms = function () {
  if (this.currentLength < this.length) {
    this.material.uniforms.minID.value = 0
  } else {
    this.material.uniforms.minID.value = this.currentNodeID - this.length
  }
  this.material.uniforms.maxID.value = this.currentNodeID
  this.material.uniforms.trailLength.value = this.currentLength
  this.material.uniforms.maxTrailLength.value = this.length
  this.material.uniforms.verticesPerNode.value = this.VerticesPerNode
}

TrailRenderer.prototype.advance = (function () {
  var orientationTangent = new Vector3()
  var position = new Vector3()
  var offset = new Vector3()
  var tempMatrix4 = new Matrix4()

  return function advance () {
    this.targetObject.updateMatrixWorld()
    tempMatrix4.copy(this.targetObject.matrixWorld)

    this.advanceWithTransform(tempMatrix4)

    this.updateUniforms()
  }
}())

TrailRenderer.prototype.advanceWithPositionAndOrientation = function (nextPosition, orientationTangent) {
  this.advanceGeometry({ position: nextPosition, tangent: orientationTangent }, null)
}

TrailRenderer.prototype.advanceWithTransform = function (transformMatrix) {
  this.advanceGeometry(null, transformMatrix)
}

TrailRenderer.prototype.advanceGeometry = (function () {
  var direction = new Vector3()
  var tempPosition = new Vector3()

  return function advanceGeometry (positionAndOrientation, transformMatrix) {
    var nextIndex = this.currentEnd + 1 >= this.length ? 0 : this.currentEnd + 1

    if (transformMatrix) {
      this.updateNodePositionsFromTransformMatrix(nextIndex, transformMatrix)
    } else {
      this.updateNodePositionsFromOrientationTangent(nextIndex, positionAndOrientation.position, positionAndOrientation.tangent)
    }

    if (this.currentLength >= 1) {
      var connectRange = this.connectNodes(this.currentEnd, nextIndex)
      var disconnectRange = null

      if (this.currentLength >= this.length) {
        var disconnectIndex = this.currentEnd + 1 >= this.length ? 0 : this.currentEnd + 1
        disconnectRange = this.disconnectNodes(disconnectIndex)
      }
    }

    if (this.currentLength < this.length) {
      this.currentLength ++
    }

    this.currentEnd ++
    if (this.currentEnd >= this.length) {
      this.currentEnd = 0
    }

    if (this.currentLength >= 1) {
      if (this.currentLength < this.length) {
        this.geometry.setDrawRange(0, (this.currentLength - 1) * this.FaceIndicesPerNode)
      } else {
        this.geometry.setDrawRange(0, this.currentLength * this.FaceIndicesPerNode)
      }
    }

    this.updateNodeID(this.currentEnd, this.currentNodeID)
    this.currentNodeID ++
  }
}())

TrailRenderer.prototype.updateHead = (function () {
  var tempMatrix4 = new Matrix4()

  return function advance () {
    if (this.currentEnd < 0) return

    this.targetObject.updateMatrixWorld()
    tempMatrix4.copy(this.targetObject.matrixWorld)

    this.updateNodePositionsFromTransformMatrix(this.currentEnd, tempMatrix4)
  }
}())

TrailRenderer.prototype.updateNodeID = function (nodeIndex, id) {
  this.nodeIDs[ nodeIndex ] = id

  var nodeIDs = this.geometry.getAttribute('nodeID')
  var nodeVertexIDs = this.geometry.getAttribute('nodeVertexID')

  for (var i = 0; i < this.VerticesPerNode; i++) {
    var baseIndex = nodeIndex * this.VerticesPerNode + i
    nodeIDs.array[ baseIndex ] = id
    nodeVertexIDs.array[ baseIndex ] = i
  }

  nodeIDs.needsUpdate = true
  nodeVertexIDs.needsUpdate = true

  nodeIDs.updateRange.offset = nodeIndex * this.VerticesPerNode
  nodeIDs.updateRange.count = this.VerticesPerNode

  nodeVertexIDs.updateRange.offset = nodeIndex * this.VerticesPerNode
  nodeVertexIDs.updateRange.count = this.VerticesPerNode
}

TrailRenderer.prototype.updateNodeCenter = function (nodeIndex, nodeCenter) {
  this.lastNodeCenter = this.currentNodeCenter

  this.currentNodeCenter = this.nodeCenters[ nodeIndex ]
  this.currentNodeCenter.copy(nodeCenter)

  var nodeCenters = this.geometry.getAttribute('nodeCenter')

  for (var i = 0; i < this.VerticesPerNode; i++) {
    var baseIndex = (nodeIndex * this.VerticesPerNode + i) * 3
    nodeCenters.array[ baseIndex ] = nodeCenter.x
    nodeCenters.array[ baseIndex + 1 ] = nodeCenter.y
    nodeCenters.array[ baseIndex + 2 ] = nodeCenter.z
  }

  nodeCenters.needsUpdate = true

  nodeCenters.updateRange.offset = nodeIndex * this.VerticesPerNode * TrailRenderer.PositionComponentCount
  nodeCenters.updateRange.count = this.VerticesPerNode * TrailRenderer.PositionComponentCount
}

TrailRenderer.prototype.updateNodePositionsFromOrientationTangent = (function () {
  var tempMatrix4 = new Matrix4()
  var tempQuaternion = new Quaternion()
  var tempOffset = new Vector3()
  var tempLocalHeadGeometry = []

  for (var i = 0; i < TrailRenderer.MaxHeadVertices; i++) {
    var vertex = new Vector3()
    tempLocalHeadGeometry.push(vertex)
  }

  return function updateNodePositionsFromOrientationTangent (nodeIndex, nodeCenter, orientationTangent) {
    var positions = this.geometry.getAttribute('position')

    this.updateNodeCenter(nodeIndex, nodeCenter)

    tempOffset.copy(nodeCenter)
    tempOffset.sub(TrailRenderer.LocalHeadOrigin)
    tempQuaternion.setFromUnitVectors(TrailRenderer.LocalOrientationTangent, orientationTangent)

    for (var i = 0; i < this.localHeadGeometry.length; i++) {
      var vertex = tempLocalHeadGeometry[ i ]
      vertex.copy(this.localHeadGeometry[ i ])
      vertex.applyQuaternion(tempQuaternion)
      vertex.add(tempOffset)
    }

    for (var i = 0; i < this.localHeadGeometry.length; i++) {
      var positionIndex = ((this.VerticesPerNode * nodeIndex) + i) * TrailRenderer.PositionComponentCount
      var transformedHeadVertex = tempLocalHeadGeometry[ i ]

      positions.array[ positionIndex ] = transformedHeadVertex.x
      positions.array[ positionIndex + 1 ] = transformedHeadVertex.y
      positions.array[ positionIndex + 2 ] = transformedHeadVertex.z
    }

    positions.needsUpdate = true
  }
}())

TrailRenderer.prototype.updateNodePositionsFromTransformMatrix = (function () {
  var tempMatrix4 = new Matrix4()
  var tempMatrix3 = new Matrix3()
  var tempQuaternion = new Quaternion()
  var tempPosition = new Vector3()
  var tempOffset = new Vector3()
  var worldOrientation = new Vector3()
  var tempDirection = new Vector3()

  var tempLocalHeadGeometry = []
  for (var i = 0; i < TrailRenderer.MaxHeadVertices; i++) {
    var vertex = new Vector3()
    tempLocalHeadGeometry.push(vertex)
  }

  function getMatrix3FromMatrix4 (matrix3, matrix4) {
    var e = matrix4.elements
    matrix3.set(e[0], e[1], e[2],
                     e[4], e[5], e[6],
                     e[8], e[9], e[10])
  }

  return function updateNodePositionsFromTransformMatrix (nodeIndex, transformMatrix) {
    var positions = this.geometry.getAttribute('position')

    tempPosition.set(0, 0, 0)
    tempPosition.applyMatrix4(transformMatrix)
    this.updateNodeCenter(nodeIndex, tempPosition)

    for (var i = 0; i < this.localHeadGeometry.length; i++) {
      var vertex = tempLocalHeadGeometry[ i ]
      vertex.copy(this.localHeadGeometry[ i ])
    }

    for (var i = 0; i < this.localHeadGeometry.length; i++) {
      var vertex = tempLocalHeadGeometry[ i ]
      vertex.applyMatrix4(transformMatrix)
    }

    if (this.lastNodeCenter && this.orientToMovement) {
      getMatrix3FromMatrix4(tempMatrix3, transformMatrix)
      worldOrientation.set(0, 0, -1)
      worldOrientation.applyMatrix3(tempMatrix3)

      tempDirection.copy(this.currentNodeCenter)
      tempDirection.sub(this.lastNodeCenter)
      tempDirection.normalize()

      if (tempDirection.lengthSq() <= 0.0001 && this.lastOrientationDir) {
        tempDirection.copy(this.lastOrientationDir)
      }

      if (tempDirection.lengthSq() > 0.0001) {
        if (!this.lastOrientationDir) this.lastOrientationDir = new Vector3()

        tempQuaternion.setFromUnitVectors(worldOrientation, tempDirection)

        tempOffset.copy(this.currentNodeCenter)

        for (var i = 0; i < this.localHeadGeometry.length; i++) {
          var vertex = tempLocalHeadGeometry[ i ]
          vertex.sub(tempOffset)
          vertex.applyQuaternion(tempQuaternion)
          vertex.add(tempOffset)
        }
      }
    }

    for (var i = 0; i < this.localHeadGeometry.length; i++) {
      var positionIndex = ((this.VerticesPerNode * nodeIndex) + i) * TrailRenderer.PositionComponentCount
      var transformedHeadVertex = tempLocalHeadGeometry[ i ]

      positions.array[ positionIndex ] = transformedHeadVertex.x
      positions.array[ positionIndex + 1 ] = transformedHeadVertex.y
      positions.array[ positionIndex + 2 ] = transformedHeadVertex.z
    }

    positions.needsUpdate = true

    positions.updateRange.offset = nodeIndex * this.VerticesPerNode * TrailRenderer.PositionComponentCount
    positions.updateRange.count = this.VerticesPerNode * TrailRenderer.PositionComponentCount
  }
}())

TrailRenderer.prototype.connectNodes = (function () {
  var returnObj = {

    'attribute': null,
    'offset': 0,
    'count': -1

  }

  return function connectNodes (srcNodeIndex, destNodeIndex) {
    var indices = this.geometry.getIndex()

    for (var i = 0; i < this.localHeadGeometry.length - 1; i++) {
      var srcVertexIndex = (this.VerticesPerNode * srcNodeIndex) + i
      var destVertexIndex = (this.VerticesPerNode * destNodeIndex) + i

      var faceIndex = ((srcNodeIndex * this.FacesPerNode) + (i * TrailRenderer.FacesPerQuad)) * TrailRenderer.IndicesPerFace

      indices.array[ faceIndex ] = srcVertexIndex
      indices.array[ faceIndex + 1 ] = destVertexIndex
      indices.array[ faceIndex + 2 ] = srcVertexIndex + 1

      indices.array[ faceIndex + 3 ] = destVertexIndex
      indices.array[ faceIndex + 4 ] = destVertexIndex + 1
      indices.array[ faceIndex + 5 ] = srcVertexIndex + 1
    }

    indices.needsUpdate = true
    indices.updateRange.count = -1

    returnObj.attribute = indices
    returnObj.offset = srcNodeIndex * this.FacesPerNode * TrailRenderer.IndicesPerFace
    returnObj.count = this.FacesPerNode * TrailRenderer.IndicesPerFace

    return returnObj
  }
}())

TrailRenderer.prototype.disconnectNodes = (function (srcNodeIndex) {
  var returnObj = {

    'attribute': null,
    'offset': 0,
    'count': -1

  }

  return function disconnectNodes (srcNodeIndex) {
    var indices = this.geometry.getIndex()

    for (var i = 0; i < this.localHeadGeometry.length - 1; i++) {
      var srcVertexIndex = (this.VerticesPerNode * srcNodeIndex) + i

      var faceIndex = ((srcNodeIndex * this.FacesPerNode) + (i * TrailRenderer.FacesPerQuad)) * TrailRenderer.IndicesPerFace

      indices.array[ faceIndex ] = 0
      indices.array[ faceIndex + 1 ] = 0
      indices.array[ faceIndex + 2 ] = 0

      indices.array[ faceIndex + 3 ] = 0
      indices.array[ faceIndex + 4 ] = 0
      indices.array[ faceIndex + 5 ] = 0
    }

    indices.needsUpdate = true
    indices.updateRange.count = -1

    returnObj.attribute = indices
    returnObj.offset = srcNodeIndex * this.FacesPerNode * TrailRenderer.IndicesPerFace
    returnObj.count = this.FacesPerNode * TrailRenderer.IndicesPerFace

    return returnObj
  }
}())

TrailRenderer.prototype.deactivate = function () {
  if (this.isActive) {
    this.scene.remove(this.mesh)
    this.isActive = false
  }
}

TrailRenderer.prototype.activate = function () {
  if (!this.isActive) {
    this.scene.add(this.mesh)
    this.isActive = true
  }
}

export default TrailRenderer
