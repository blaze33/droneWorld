import { Vector2, Vector3 } from 'three'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import clone from 'clone'
import { screenXYclamped } from '../utils'
import PubSub from '../events'
import { scene, camera } from '../index'
import Crosshair from './crosshair'

let pilotDrone
let screenCenter = new Vector2(window.innerWidth / 2, window.innerHeight / 2)
PubSub.subscribe('x.screen.resized', (msg, rendererSize) => {
  screenCenter = new Vector2(rendererSize.width / 2, rendererSize.height / 2)
})
let horizonStyle
let focalStyle
const hudData = {
  targets: new Set(),
  targetsInSight: new Set(),
  targetsInFront: new Set(),
  gunTarget: null
}

class HUD extends Component {
  constructor (props) {
    super(props)
    this.state = { gunHeat: 0, lockLevel: 0 }
  }

  componentDidMount () {
    PubSub.publish('x.hud.mounted')
  }

  gunHeat () {
    if (!pilotDrone || !pilotDrone.gunClock.running) {
      return Math.max(0, this.state.gunHeat - 0.01)
    }
    const delta = pilotDrone.gunClock.getDelta()
    const gunHeat = this.state.gunHeat + delta / 1.5
    if (gunHeat >= 1) {
      PubSub.publish('x.drones.gun.stop', pilotDrone)
      PubSub.publish('x.camera.shake.stop')
      pilotDrone.gunClock.stop()
    }
    return Math.min(gunHeat, 1)
  }

  lockLevel () {
    if (hudData.targetsInSight.size === 0) {
      return Math.max(0, this.state.lockLevel - 0.02)
    }
    const times = []
    hudData.targetsInSight.forEach(target => {
      const delta = target.lockClock.getDelta()
      times.push(this.state.lockLevel + delta / 2)
    })
    return Math.min(Math.max(...times), 1)
  }

  update (newState) {
    const gunHeat = this.gunHeat()
    const lockLevel = this.lockLevel()
    this.setState({
      ...newState,
      gunHeat,
      lockLevel,
      lock: lockLevel === 1
    })
  }

  render () {
    const targets = Array.from(hudData.targets)
    const targetsData = targets.map(target => Object.assign(
      clone(target.userData),
      { id: target.id }
    ))
    return (
      <div>
        <div id='limiter' />
        <div id='pointer' />
        <div id='focal' style={this.state.focalStyle} />
        <div id='horizon' style={this.state.horizonStyle} />
        {pilotDrone ? (
          <div id='messages'>
            <div>{pilotDrone.userData.altitude.toFixed(0)} m</div>
            <div>{pilotDrone.userData.speed.toFixed(0)} m/s</div>
          </div>
        ) : null}
        <svg className='vector'>
          <Crosshair
            size='30' x={screenCenter.x} y={screenCenter.y}
            fill='transparent'
            stroke='#0f0'
            strokeWidth='17'
            opacity='0.8'
          />
          <circle
            cx={screenCenter.x} cy={screenCenter.y} r={160}
            stroke='#666' opacity={0.8} strokeWidth='10' fill='transparent'
            strokeDasharray='140 1000' transform={`rotate(155 ${screenCenter.x} ${screenCenter.y})`}
            strokeLinecap='round'
          />
          {
            this.state.lockLevel
              ? (<circle
                cx={screenCenter.x} cy={screenCenter.y} r={160}
                stroke='#0f0' opacity={0.8} strokeWidth='10' fill='transparent'
                strokeDasharray={`${this.state.lockLevel * 140} 1000`}
                transform={`rotate(155 ${screenCenter.x} ${screenCenter.y})`}
                strokeLinecap='round'
              />) : null
          }
          <circle
            cx={screenCenter.x} cy={screenCenter.y} r={160}
            stroke='#666' opacity={0.8} strokeWidth='10' fill='transparent'
            strokeDasharray='140 1000'
            strokeLinecap='round' transform={`rotate(205 ${screenCenter.x} ${screenCenter.y}) translate(${screenCenter.x * 2}, 0) scale(-1, 1)`}
          />
          {
            this.state.gunHeat
              ? (<circle
                cx={screenCenter.x} cy={screenCenter.y} r={160}
                stroke='orange' opacity={0.8} strokeWidth='10' fill='transparent'
                strokeDasharray={`${this.state.gunHeat * 140} 1000`}
                strokeLinecap='round' transform={`rotate(205 ${screenCenter.x} ${screenCenter.y}) translate(${screenCenter.x * 2}, 0) scale(-1, 1)`}
              />)
              : null
          }
          {targets.map(target => (
            target.gunHud
              ? (<g key={target.id}>
                <path
                  d={`M ${target.hudPosition.x} ${target.hudPosition.y}
                    l ${target.direction.x} ${target.direction.y}`}
                  strokeWidth='1'
                  stroke={target === this.state.gunTarget ? '#0f0' : 'orange'}
                  fill='transparent'
                />
                {target === this.state.gunTarget ? (
                  <Crosshair
                    size='30'
                    x={target.hudPosition.x + target.direction.x}
                    y={target.hudPosition.y + target.direction.y}
                    fill='#0f0'
                    fillOpacity='0.6'
                    stroke='#0f0'
                    strokeWidth='17'
                    strokeOpacity='1'
                  />
                ) : null}
              </g>)
              : null
          ))}
        </svg>
        <div id='targets'>
          {targetsData.map(target => (
            <div className='target' key={target.id} id={'target-' + target.id} style={target.hud.element.style}>
              <div className='life' style={{ width: target.life / 100 * 20 }} />
              <div className='arrow' style={target.hud.arrow.style} />
              <div className='distance'>{target.hud.distance.innerHTML}</div>
              <div className='name'>drone-{target.id}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
}

const registerTarget = (msg, target) => {
  hudData.targets.add(target)
  target.userData.hud = {
    element: { style: {} },
    arrow: { style: {} },
    distance: { style: {} }
  }
  let hudPosition
  let targetDistance2D
  let targetDistance3D
  let targetVector2D
  let targetVector3D
  let targetDirection
  const ZONE = 400
  const FOCAL_SIZE = 150
  const GUN_RANGE = 500
  const targetLoop = (timestamp, delta) => {
    if (!hudElement.mounted) return
    hudPosition = screenXYclamped(target.position)
    if (hudPosition.z > 1) {
      hudPosition.x = window.innerWidth - hudPosition.x
      hudPosition.y = window.innerHeight - 10
      target.userData.hud.element.style.borderColor = 'red'
      target.userData.hud.arrow.style.borderBottomColor = 'red'
    } else {
      target.userData.hud.element.style.borderColor = 'orange'
      target.userData.hud.arrow.style.borderBottomColor = 'orange'
    }
    target.hudPosition = hudPosition
    targetVector2D = new Vector2(hudPosition.x, hudPosition.y).sub(screenCenter)
    target.userData.hudPositionCentered = targetVector2D
    if (targetVector2D.length() > ZONE) {
      targetVector2D.normalize().multiplyScalar(ZONE)
    }
    target.userData.hud.arrow.style.opacity = 0.8 * (1 - (ZONE - targetVector2D.length()) / 50)
    targetVector3D = camera.position.clone().sub(target.position)
    targetDistance3D = targetVector3D.length()
    target.userData.distance = targetDistance3D
    target.userData.hud.distance.innerHTML = targetDistance3D.toFixed(0)
    target.userData.hud.distance.style.color = targetDistance3D < GUN_RANGE ? '#0f0' : 'orange'
    target.userData.hud.element.style.transform = `
      translateX(${targetVector2D.x + screenCenter.x}px)
      translateY(${targetVector2D.y + screenCenter.y}px)
      scale(${1.1 - Math.min(0.2, targetDistance3D / 2000)})
    `
    target.userData.hud.arrow.style.transform = `
      translateY(2px)
      rotate(${targetVector2D.angle() / Math.PI * 180 + 90}deg)
    `
    targetDistance2D = targetVector2D.length()
    if (!target.destroyed && target.userData.hud.element.style.borderColor === 'orange' && targetDistance2D < FOCAL_SIZE) {
      target.userData.hud.arrow.style.borderBottomColor = '#0f0'
      hudData.targetsInSight.add(target)
      if (!target.lockClock.running) target.lockClock.start()
    } else {
      hudData.targetsInSight.delete(target)
      target.lockClock.stop()
    }
    if (!target.destroyed && targetDistance2D < ZONE - 10) {
      hudData.targetsInFront.add(target)
    } else {
      hudData.targetsInFront.delete(target)
    }
    if (hudPosition.z <= 1 && targetDistance2D < ZONE * 0.8) {
      targetDirection = screenXYclamped(
        target.position.clone().add(target.velocity.clone().multiplyScalar(
          Math.min(1,
            (targetDistance3D + targetVector3D.clone().add(target.velocity).length()) / 2 / GUN_RANGE
          )
        ))
      )
      target.gunHud = true
      target.direction = {
        x: targetDirection.x - (targetVector2D.x + screenCenter.x),
        y: targetDirection.y - (targetVector2D.y + screenCenter.y)
      }
    } else {
      target.gunHud = false
    }
    target.ready = true
  }
  targetLoop.id = target.id
  const destroyTarget = (msg, targetToDestroy) => {
    if (targetToDestroy.id !== target.id) return
    scene.remove(targetToDestroy)
    PubSub.publish('x.loops.remove', targetLoop)
    hudData.targets.delete(targetToDestroy)
    hudData.targetsInSight.delete(target)
    hudElement.forceUpdate()
  }
  PubSub.subscribe('x.drones.destroy', destroyTarget)
  PubSub.publish('x.loops.push', targetLoop)
}
PubSub.subscribe('x.hud.register.target', registerTarget)

const camVec = new Vector3()
let localX
let localY
let rollAngle
let pitch
let rollAngleDegree
const hudLoop = (timestamp) => {
  localX = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
  rollAngle = (
    Math.PI / 2 - camera.up.angleTo(localX) * Math.sign(camera.up.dot(localY))
  )
  camera.rollAngle = rollAngle
  pitch = camera.up.dot(camera.getWorldDirection(camVec))
  camera.pitch = pitch
  rollAngleDegree = rollAngle / Math.PI * 180
  horizonStyle = {
    transform: `translateX(-50%) translateY(${pitch * window.innerHeight / 2}px) rotate(${rollAngleDegree}deg)`
  }
  if (hudElement.state.lock) {
    focalStyle = { boxShadow: '0 0 75px #0f0' }
  } else {
    focalStyle = { boxShadow: '' }
  }
  hudData.gunTarget = selectNearestGunTarget()
  hudElement.update({ horizonStyle, focalStyle, gunTarget: hudData.gunTarget })
}

PubSub.subscribe('x.hud.mounted', () => {
  PubSub.publish('x.loops.push', hudLoop)
  hudElement.mounted = true
})

PubSub.subscribe('x.drones.pilotDrone.loaded', (msg, data) => {
  pilotDrone = data.pilotDrone
})

PubSub.subscribe('x.drones.missile.start', (msg, pilotDrone) => {
  hudElement.setState(state => ({ ...state, lockLevel: 0, lock: false }))
})

const selectNearestTargetInSight = () => {
  if (hudData.targetsInSight.size === 0 || !hudElement.state.lock) return null
  const distances = []
  hudData.targetsInSight.forEach(target =>
    distances.push([camera.position.distanceTo(target.position), target])
  )
  distances.sort((a, b) => a[0] > b[0])
  return distances[0][1]
}

const selectNearestGunTarget = () => {
  if (hudData.targetsInSight.size === 0) return null
  const distances = []
  hudData.targetsInSight.forEach(target =>
    distances.push([
      new Vector2(target.hudPosition.x, target.hudPosition.y)
        .sub(screenCenter)
        .add(new Vector2(target.direction.x, target.direction.y)).length(),
      target])
  )
  distances.sort((a, b) => a[0] > b[0])
  return distances[0][1]
}

const hudElement = ReactDOM.render(
  <HUD />,
  document.getElementById('hud')
)

export {
  selectNearestTargetInSight,
  selectNearestGunTarget,
  hudElement,
  hudData
}
