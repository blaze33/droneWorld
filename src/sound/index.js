import {
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

const audioMapper = sound => {
  audioLoader.load(sound.url, buffer => { sound.buffer = buffer })
}

const setupSound = () => {
  impacts.map(audioMapper)
  gatling.map(audioMapper)

  PubSub.subscribe('x.sound.impact', (msg, drone) => {
    const n = Math.floor(Math.random() * impacts.length)
    if (!impacts[n].buffer) return
    const sound = new PositionalAudio(camera.listener)
    sound.setBuffer(impacts[n].buffer)
    sound.setRefDistance(100)
    drone.add(sound)
    sound.play()
    drone.remove(sound)
  })

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
