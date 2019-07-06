const crackFix = (geometry) => {
  // Takes a THREE.PlaneBufferGeometry and apply 'skirts' to the plane by moving the external vertices
  const w = geometry.parameters.widthSegments + 1
  const h = geometry.parameters.heightSegments + 1

  if (w < 4 || h < 4) return

  const zOffset = Math.sqrt(geometry.parameters.width * geometry.parameters.height) * 0.1 * 255 / Math.sqrt(w * h)

  // console.time('crackFix')
  for (let i = 1; i < w - 1; i++) {
    geometry.attributes.position.setZ(
      i,
      geometry.attributes.position.getZ(w + i)
    )
  }
  for (let i = 1; i < w - 1; i++) {
    geometry.attributes.position.setZ(
      (h - 1) * w + i,
      geometry.attributes.position.getZ((h - 2) * w + i)
    )
  }
  let i = 0
  for (let j = 0; j < h; j++) {
    geometry.attributes.position.setZ(
      j * w,
      geometry.attributes.position.getZ(1 + j * w)
    )
  }
  i = w
  for (let j = 0; j < h; j++) {
    geometry.attributes.position.setZ(
      j * w + i - 1,
      geometry.attributes.position.getZ(j * w + i - 2)
    )
  }

  geometry.computeVertexNormals()

  for (let i = 1; i < w - 1; i++) {
    geometry.attributes.position.setXYZ(
      i,
      geometry.attributes.position.getX(w + i),
      geometry.attributes.position.getY(w + i),
      geometry.attributes.position.getZ(w + i) - zOffset
    )
  }
  for (let i = 1; i < w - 1; i++) {
    geometry.attributes.position.setXYZ(
      (h - 1) * w + i,
      geometry.attributes.position.getX((h - 2) * w + i),
      geometry.attributes.position.getY((h - 2) * w + i),
      geometry.attributes.position.getZ((h - 2) * w + i) - zOffset
    )
  }
  i = 0
  for (let j = 0; j < h; j++) {
    geometry.attributes.position.setXYZ(
      j * w,
      geometry.attributes.position.getX(1 + j * w),
      geometry.attributes.position.getY(1 + j * w),
      geometry.attributes.position.getZ(1 + j * w) - zOffset
    )
  }
  i = w
  for (let j = 0; j < h; j++) {
    geometry.attributes.position.setXYZ(
      j * w + i - 1,
      geometry.attributes.position.getX(j * w + i - 2),
      geometry.attributes.position.getY(j * w + i - 2),
      geometry.attributes.position.getZ(j * w + i - 2) - zOffset
    )
  }

  geometry.scale((w - 1) / (w - 3), (h - 1) / (h - 3), 1)
  // console.timeEnd('crackFix')
}

export { crackFix }
