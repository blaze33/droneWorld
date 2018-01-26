import {Vector2, Vector3} from 'three'
import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import {screenXYclamped} from '../utils'
import PubSub from '../events'
import {scene, camera} from '../index'

let hudHorizon
let hudFocal
let targets = []
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
            <div className='target' key={target.id} id={'target-' + target.id}>
              <div className='life' />
            </div>
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

const registerTarget = (msg, target) => {
  targets.push(target)
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
    } else {
      hudFocal.style.boxShadow = ''
    }
    if (!target.destroyed && targetDistance < 75) {
      targetsInSight.add(target)
    } else {
      targetsInSight.delete(target)
    }
  }
  targetLoop.id = target.id
  const destroyTarget = (msg, targetToDestroy) => {
    if (targetToDestroy.id !== target.id) return
    scene.remove(targetToDestroy)
    PubSub.publish('x.loops.remove', targetLoop)
    targets = targets.filter(item => item.id !== targetToDestroy.id)
    targetsInSight.delete(target)
    hudElement.forceUpdate()
  }
  PubSub.subscribe('x.drones.destroy', destroyTarget)
  PubSub.publish('x.loops.push', targetLoop)
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
  PubSub.publish('x.loops.push', hudLoop)
})

const selectNearestTargetInSight = () => {
  if (targetsInSight.size === 0) return null
  const distances = []
  targetsInSight.forEach(target =>
    distances.push([camera.position.distanceTo(target.position), target])
  )
  distances.sort((a, b) => a[0] > b[0])
  return distances[0][1]
}

export {selectNearestTargetInSight}
