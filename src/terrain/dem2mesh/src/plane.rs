pub fn build_tile_mesh(size: f32, segments: u8, heightmap: Vec<f32>) -> (Vec<f32>, Vec<u32>) {
	let z_scale = 0.075;
	let size_half = size / 2f32;
    let grid = u32::from(segments);
	let grid1 = grid + 1;
	let segment_size = size / grid as f32;
    let heightmap_n = (heightmap.len() as f32).sqrt();
    let ratio = heightmap_n / grid1 as f32;

	// buffers
    let index_size = grid as usize * grid as usize * 2 * 3;
    let mut index = Vec::with_capacity(index_size);
    let position_size = grid1 as usize * grid1 as usize * 3;
	let mut position = Vec::with_capacity(position_size);

    // generate vertices
	for iy in 0..grid1 {
		let y = iy as f32 * segment_size - size_half;
		for ix in 0..grid1 {
			let x = ix as f32 * segment_size - size_half;
            let z = heightmap[
				((iy as f32 * ratio).round() * heightmap_n
					+ ix as f32 * ratio
				).round() as usize
			] * z_scale;
			position.push(x);
			position.push(-y);
			position.push(z);
		}
	}

	// indices
	for iy in 0..grid {
		for ix in 0..grid {
			let a = ix + grid1 * iy;
			let b = ix + grid1 * ( iy + 1 );
			let c = ( ix + 1 ) + grid1 * ( iy + 1 );
			let d = ( ix + 1 ) + grid1 * iy;

			// faces
			index.push(a);
			index.push(b);
			index.push(d);
			index.push(b);
			index.push(c);
			index.push(d);
		}
	}

    (position, index)
}