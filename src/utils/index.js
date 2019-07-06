import { camera } from '../index'

function screenXY (vec3, centered = false) {
  const vector = vec3.clone()

  const widthHalf = (window.innerWidth / 2)
  const heightHalf = (window.innerHeight / 2)

  vector.project(camera)

  vector.x = (vector.x * widthHalf)
  vector.y = -(vector.y * heightHalf)

  if (!centered) {
    vector.x += widthHalf
    vector.y += heightHalf
  }

  return vector
}

const screenXYclamped = (vec3) => {
  const screenPosition = screenXY(vec3)
  return {
    x: Math.min(Math.max(10, screenPosition.x), window.innerWidth - 10),
    y: Math.min(Math.max(10, screenPosition.y), window.innerHeight - 10),
    z: screenPosition.z
  }
}

const clamp = (min, value, max) => Math.min(Math.max(min, value), max)

export { screenXY, screenXYclamped, clamp }
