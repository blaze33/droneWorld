import {
  hudElement,
  hudData
} from '../hud'
import {clamp} from '../utils'

class AutoPilot {
  constructor(ship, controls, active) {
    this.ship = ship
    this.controls = controls
    this.active = active
    this.target = null
    this.pointerElement = document.getElementById('pointer')
  }

  toggle() {
    this.active = !this.active
  }

  update(delta) {
    if (!this.active) return
    this.state = {...hudElement.state, ...hudData}

    if (this.target === null || this.target.destroyed) {
      this.target = Array.from(this.state.targets)
        .filter(target => target.ready && !target.destroyed)
        .reduce(
          (a, b) => a.userData.distance < b.userData.distance ? a : b
        )
    }

    if (!this.target) return

    const move = {x: 0, y: 0}
    if (this.target.hudPosition.z > 1) {
      let uturnX = Math.sign(this.target.userData.hudPositionCentered.x) * 100
      move.x += uturnX
      move.y += uturnX * Math.abs(Math.sin(this.ship.rollAngle))
    } else {
      move.x += clamp(-100, this.target.userData.hudPositionCentered.x, 100)
      move.y += clamp(-100, this.target.userData.hudPositionCentered.y, 100)
    }
    this.controls.mousemove({
      pageX: move.x,
      pageY: move.y
    })
    this.pointerElement.style.transform = `
      translateX(${move.x - 16}px)
      translateY(${move.y - 16}px)
    `

    if (this.target.userData.distance > 150) {
      this.controls.moveState.forward = 1
    } else {
      this.controls.moveState.forward = 0
    }
  }
}

export default AutoPilot
