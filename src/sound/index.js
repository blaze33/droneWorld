import {
  AudioListener,
  Audio,
  PositionalAudio,
  AudioLoader
} from 'three'
import {camera} from '../index'
import PubSub from '../events'

const audioLoader = new AudioLoader()

const impacts = [
  {url: require('./impact1.ogg')},
  {url: require('./impact2.ogg')}
]

const gatling = [
  {url: require('./gatling.ogg')}
]

const explosions = [
  {url: require('./explosion1.ogg')}
]

const audioMapper = sound => {
  audioLoader.load(sound.url, buffer => { sound.buffer = buffer })
}

const setupSound = () => {
  camera.listener = new AudioListener()
  camera.add(camera.listener)

  impacts.map(audioMapper)
  gatling.map(audioMapper)
  explosions.map(audioMapper)

  PubSub.subscribe('x.sound.impact', (msg, drone) => {
    const n = Math.floor(Math.random() * impacts.length)
    if (!impacts[n].buffer) return
    const sound = new PositionalAudio(camera.listener)
    sound.setBuffer(impacts[n].buffer)
    sound.setRefDistance(100)
    drone.add(sound)
    sound.play()
    // drone.remove(sound) // necessary ?
  })

  const playExplosion = (msg, drone) => {
    if (!explosions[0].buffer) return
    const sound = new PositionalAudio(camera.listener)
    sound.setBuffer(explosions[0].buffer)
    sound.setRefDistance(100)
    drone.add(sound)
    sound.play()
    // drone.remove(sound) // necessary ?
  }
  PubSub.subscribe('x.drones.destroy', playExplosion)
  PubSub.subscribe('x.drones.explosion', playExplosion)

  const gatlingSound = new Audio(camera.listener)
  PubSub.subscribe('x.drones.gun.start', (msg, drone) => {
    if (!gatling[0].buffer) return
    gatlingSound.setBuffer(gatling[0].buffer)
    gatlingSound.setLoop(true)
    gatlingSound.play()
  })
  PubSub.subscribe('x.drones.gun.stop', (msg, drone) => {
    gatlingSound.stop()
  })
}

export default setupSound
