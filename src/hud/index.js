import {Vector2, Vector3} from 'three'
import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import {screenXYclamped} from '../utils'
import PubSub from '../events'
import {camera, loops} from '../index'

let hudHorizon
let hudFocal
const targets = []
const targetsInSight = new Set()

class HUD extends Component {
  componentDidMount () {
    PubSub.publish('x.hud.mounted')
  }

  render () {
    return (
      <div>
        <div id='pointer' />
        <div id='focal' />
        <div id='horizon' />
        <div id='targets'>
          {targets.map(target => (
            <div className='target' key={target.id} id={'target-' + target.id} />
          ))}
        </div>
      </div>
    )
  }
}

const hudElement = ReactDOM.render(
  <HUD />,
  document.getElementById('hud')
)
console.log(hudElement)

const registerTarget = (msg, target) => {
  targets.push(target)
  console.log(targets)
  hudElement.forceUpdate()
  const targetElement = document.getElementById('target-' + target.id)
  let hudPosition
  let targetDistance
  const targetLoop = () => {
    hudPosition = screenXYclamped(target.position)
    targetElement.style.left = `${hudPosition.x - 10}px`
    targetElement.style.top = `${hudPosition.y - 10}px`
    // TODO use translate instead of top/left
    targetElement.style.borderColor = hudPosition.z > 1 ? 'red' : 'orange'
    targetDistance = new Vector2(window.innerWidth / 2, window.innerHeight / 2).sub(
        new Vector2(hudPosition.x, hudPosition.y)
      ).length()
    if (targetElement.style.borderColor === 'orange' && targetDistance < 75) {
      targetElement.style.borderColor = '#0f0'
      hudFocal.style.boxShadow = '0 0 6px #0f0'
      targetsInSight.add(target)
    } else {
      hudFocal.style.boxShadow = ''
      targetsInSight.delete(target)
    }
  }
  loops.push(targetLoop)
}
PubSub.subscribe('x.hud.register.target', registerTarget)

const hudLoop = (timestamp) => {
  const localX = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
  const rollAngle = (
    Math.PI / 2 - camera.up.angleTo(localX) * Math.sign(camera.up.dot(localY))
  )
  camera.rollAngle = rollAngle
  const pitch = camera.up.dot(camera.getWorldDirection())
  const rollAngleDegree = rollAngle / Math.PI * 180
  hudHorizon.style.transform = `translateX(-50%) translateY(${pitch * window.innerHeight / 2}px) rotate(${rollAngleDegree}deg)`
}
PubSub.subscribe('x.hud.mounted', () => {
  hudHorizon = document.getElementById('horizon')
  hudFocal = document.getElementById('focal')
  loops.push(hudLoop)
})

const selectNearestTargetInSight = () => {
  if (targetsInSight.size === 0) return null
  const distances = []
  targetsInSight.forEach(target =>
    distances.push([camera.position.distanceTo(target.position), target])
  )
  distances.sort((a, b) => a[0] > b[0])
  console.log(distances, distances[0][1].getElementById)
  return distances[0][1]
}

export {selectNearestTargetInSight}
