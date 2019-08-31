import {
  Quaternion,
  Vector2,
  Vector3
} from 'three'

/**
 * @author James Baicoianu / http://www.baicoianu.com/
 */

export default function FlyControls (object, domElement, nipple, pointer) {
  this.object = object

  this.domElement = (domElement !== undefined) ? domElement : document
  if (domElement) this.domElement.setAttribute('tabindex', -1)

  // API

  this.movementSpeed = 0.1
  this.rollSpeed = 0.001

  this.dragToLook = false
  this.autoForward = false

  this.nipple = nipple
  if (this.nipple) {
    this.nipple.on('move', (event, data) => this.nipplemove(event, data))
    this.nipple.on('end', (event, data) => {
      this.autoForward = false
      this.updateMovementVector()
    })
  }

  this.acceleration = 100
  this.velocity = new Vector3(0, 0, 0)
  this.zone = 400

  this.pointer = pointer
  if (this.pointer) {
    const pointerElement = document.getElementById('pointer')
    this.pointer.on('attain', movements => {
      const dims = this.getContainerDimensions().size
      pointerElement.style.left = dims[0] / 2 + 'px'
      pointerElement.style.top = dims[1] / 2 + 'px'

      // movements is a readable stream
      const pointerVector = new Vector2(0, 0)
      movements.on('data', move => {
        pointerVector.add(new Vector2(move.dx, move.dy))
        if (pointerVector.length() > this.zone) {
          pointerVector.normalize().multiplyScalar(this.zone)
        }
        pointerElement.style.transform = `
          translateX(${pointerVector.x - 16}px)
          translateY(${pointerVector.y - 16}px)
        `
        this.mousemove({
          pageX: (pointerVector.x) / 1.5,
          pageY: (pointerVector.y) / 1.5
        })
      })

      movements.on('close', function () {
        // no more movements from this pointer-lock session.
      })
    })
  }

  // disable default target object behavior

  this.nipplemove = function (event, data) {
    const mockEvent = {
      pageX: data.distance * Math.cos(data.angle.radian) * 1.5,
      pageY: -data.distance * Math.sin(data.angle.radian) * 1.5
    }
    this.mousemove(mockEvent)
    this.autoForward = true
    this.updateMovementVector()
  }

  // internals

  this.tmpQuaternion = new Quaternion()

  this.moveState = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    forward: 0,
    back: 0,
    pitchUp: 0,
    pitchDown: 0,
    yawLeft: 0,
    yawRight: 0,
    rollLeft: 0,
    rollRight: 0
  }
  this.moveVector = new Vector3(0, 0, 0)
  this.rotationVector = new Vector3(0, 0, 0)

  this.keydown = function (event) {
    if (event.altKey) {
      return
    }

    // event.preventDefault();

    switch (event.keyCode) {
      case 16: /* shift */ this.movementSpeedMultiplier = 0.1; break

      case 87: /* W */ this.moveState.forward = 1; break
      case 83: /* S */ this.moveState.back = 1; break

      case 65: /* A */ this.moveState.yawLeft = 1; break
      case 68: /* D */ this.moveState.yawRight = 1; break

      case 82: /* R */ this.moveState.up = 1; break
      case 70: /* F */ this.moveState.down = 1; break

      case 38: /* up */ this.moveState.pitchUp = 1; break
      case 40: /* down */ this.moveState.pitchDown = 1; break

      case 37: /* left */ this.moveState.yawLeft = 1; break
      case 39: /* right */ this.moveState.yawRight = 1; break

      case 81: /* Q */ this.moveState.rollLeft = 1; break
      case 69: /* E */ this.moveState.rollRight = 1; break

      default: // do nothing
    }

    this.updateMovementVector()
    this.updateRotationVector()
  }

  this.keyup = function (event) {
    switch (event.keyCode) {
      case 16: /* shift */ this.movementSpeedMultiplier = 1; break

      case 87: /* W */ this.moveState.forward = 0; break
      case 83: /* S */ this.moveState.back = 0; break

      case 65: /* A */ this.moveState.yawLeft = 0; break
      case 68: /* D */ this.moveState.yawRight = 0; break

      case 82: /* R */ this.moveState.up = 0; break
      case 70: /* F */ this.moveState.down = 0; break

      case 38: /* up */ this.moveState.pitchUp = 0; break
      case 40: /* down */ this.moveState.pitchDown = 0; break

      case 37: /* left */ this.moveState.yawLeft = 0; break
      case 39: /* right */ this.moveState.yawRight = 0; break

      case 81: /* Q */ this.moveState.rollLeft = 0; break
      case 69: /* E */ this.moveState.rollRight = 0; break

      default: // do nothing
    }

    this.updateMovementVector()
    this.updateRotationVector()
  }

  this.mousemove = function (event) {
    this.moveState.yawLeft = -event.pageX / this.zone
    this.moveState.rollLeft = this.moveState.yawLeft / 2 - this.object.rollAngle / 5
    this.moveState.pitchDown = event.pageY / this.zone
  }

  this.deltaVelocity = null
  this.deltaPosition = null
  this.update = (delta) => {
    var rotMult = delta * this.rollSpeed

    this.deltaVelocity = this.moveVector.clone().multiplyScalar(
      delta / 1000 * this.acceleration
    )
    this.velocity.sub(
      this.velocity.clone().multiplyScalar(
        Math.max(
          1,
          this.deltaVelocity.length() ? 1 : 100 / (this.velocity.length() + 1)
        ) * 0.01 * delta / 16.67
      )
    ).add(this.deltaVelocity)
    this.deltaPosition = this.velocity.clone().multiplyScalar(delta / 1000)
    this.object.position.add(this.deltaPosition.applyQuaternion(this.object.quaternion))

    this.tmpQuaternion.set(this.rotationVector.x * rotMult, this.rotationVector.y * rotMult, this.rotationVector.z * rotMult, 1).normalize()
    this.object.quaternion.multiply(this.tmpQuaternion)

    // expose the rotation vector for convenience
    this.object.rotation.setFromQuaternion(this.object.quaternion, this.object.rotation.order)

    this.updateRotationVector()
    this.updateMovementVector()
  }

  this.updateMovementVector = function () {
    var forward = (this.moveState.forward || (this.autoForward && !this.moveState.back)) ? 1 : 0

    this.moveVector.x = (-this.moveState.left + this.moveState.right)
    this.moveVector.y = (-this.moveState.down + this.moveState.up)
    this.moveVector.z = (-forward + this.moveState.back)

    // console.log( 'move:', [ this.moveVector.x, this.moveVector.y, this.moveVector.z ] );
  }

  this.updateRotationVector = function () {
    this.rotationVector.x = (-this.moveState.pitchDown + this.moveState.pitchUp)
    this.rotationVector.y = (-this.moveState.yawRight + this.moveState.yawLeft)
    this.rotationVector.z = (-this.moveState.rollRight + this.moveState.rollLeft)

    // console.log( 'rotate:', [ this.rotationVector.x, this.rotationVector.y, this.rotationVector.z ] );
  }

  this.getContainerDimensions = function () {
    if (this.domElement !== document) {
      return {
        size: [this.domElement.offsetWidth, this.domElement.offsetHeight],
        offset: [this.domElement.offsetLeft, this.domElement.offsetTop]
      }
    } else {
      return {
        size: [window.innerWidth, window.innerHeight],
        offset: [0, 0]
      }
    }
  }

  function bind (scope, fn) {
    return function () {
      fn.apply(scope, arguments)
    }
  }

  function contextmenu (event) {
    event.preventDefault()
  }

  this.dispose = function () {
    this.domElement.removeEventListener('contextmenu', contextmenu, false)

    window.removeEventListener('keydown', _keydown, false)
    window.removeEventListener('keyup', _keyup, false)
  }

  var _keydown = bind(this, this.keydown)
  var _keyup = bind(this, this.keyup)

  this.domElement.addEventListener('contextmenu', contextmenu, false)

  window.addEventListener('keydown', _keydown, false)
  window.addEventListener('keyup', _keyup, false)

  this.updateMovementVector()
  this.updateRotationVector()
};
