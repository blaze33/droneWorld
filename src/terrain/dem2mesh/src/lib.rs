// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

extern crate alloc;
extern crate oxipng;
extern crate meshopt;

use alloc::alloc::{Layout, alloc, dealloc};
use wasm_bindgen::prelude::*;
use js_sys::{Float32Array, Uint32Array, Array};

mod utils;
mod plane;


#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(v: String);
}

#[wasm_bindgen]
pub fn png2elevation(png_bytes: &[u8]) -> Vec<f32> {
    let png = oxipng::open_from_memory(png_bytes);
    assert_eq!(png.raw.data.len(), 256 * (256 * 3 + 1));

    png.raw.data.chunks(256 * 3 + 1)
        .flat_map(|line| line[1..].chunks(3)
            .map(|rgb| f32::from(rgb[0]) * 256.0 + f32::from(rgb[1]) + f32::from(rgb[2]) / 256.0 - 32768.0)
        )
        .collect()
}

static mut LAYOUT: Option<Layout> = None;

#[allow(non_snake_case)]
#[wasm_bindgen]
pub extern fn _Znwm(_: usize) -> *mut std::ffi::c_void {
    panic!("error: set meshopt allocator")
}

#[allow(non_snake_case)]
#[wasm_bindgen]
pub extern fn _ZdlPv(_: *mut std::ffi::c_void) {
    panic!("error: set meshopt allocator");
}

unsafe extern fn meshopt_alloc(size: usize) -> *mut std::ffi::c_void{
    LAYOUT = Some(Layout::from_size_align(size, 1).unwrap());
    alloc(LAYOUT.expect("alloc incorrect layout")) as *mut std::ffi::c_void
}

unsafe extern fn meshopt_dealloc(ptr: *mut std::ffi::c_void) {
    dealloc(ptr as *mut u8, LAYOUT.unwrap());
}

#[wasm_bindgen]
pub extern fn __assert_fail(a: u32, b: u32, c: u32, d: u32) {
    log(format!("{} {} {} {}", &a, &b, &c, &d));
}

fn simplify(
    indices: &[u32],
    vertices: &[f32],
    target_count: usize,
    target_error: f32,
) -> Vec<u32> {

    let positions = vertices.as_ptr() as *const f32;
    let mut index_result: Vec<u32> = vec![0; indices.len()];
    let index_count = unsafe {
        meshopt::ffi::meshopt_simplify(
            index_result.as_mut_ptr() as *mut ::std::os::raw::c_uint,
            indices.as_ptr() as *const ::std::os::raw::c_uint,
            indices.len(),
            positions,
            vertices.len(),
            12,
            target_count,
            target_error,
        )
    };
    index_result.resize(index_count, 0u32);
    index_result
}

fn optimize(index: &[u32], position: &[f32]) -> Vec<f32> {
    let mut position_result: Vec<f32> = vec![0f32; position.len()];
    let position_count = unsafe {
        meshopt::ffi::meshopt_optimizeVertexFetch(
            position_result.as_mut_ptr() as *mut std::ffi::c_void,
            index.as_ptr() as *mut ::std::os::raw::c_uint,
            index.len(),
            position.as_ptr() as *const std::ffi::c_void,
            position.len(),
            12
        )
    };
    position_result.resize(position_count * 3, 0f32);
    position_result
}

#[wasm_bindgen]
pub fn png2mesh(png_bytes: &[u8], size: f32, segments: u8) -> Array {
    let heightmap = png2elevation(png_bytes);

    let (position, index) = plane::build_tile_mesh(size, segments, heightmap);

    // TODO simplify mesh
    // first: set meshopt allocator
    unsafe {
        meshopt::ffi::meshopt_setAllocator(
            Some(meshopt_alloc),
            Some(meshopt_dealloc)
        );
    }
    // simplifyu the mesh
    let new_index = simplify(
        &index, &position,
        (index.len() as f32 * 0.2) as usize, 0.01
    );
    // optimize the vertices as some vertices are now unused
    let new_position = optimize(&new_index, &position);

    // compute uvs
    let uv: Vec<f32> = new_position.chunks(3).map(
        |xyz| vec![
            (xyz[0] + size / 2.0) / size,
            (xyz[1] + size / 2.0) / size
        ]
    ).flatten().collect();

    let result = Array::new();
    unsafe {
        result.push(&Float32Array::view(&new_position));
        result.push(&Uint32Array::view(&new_index));
        result.push(&Float32Array::view(&uv));
    }
    result
}

#[wasm_bindgen]
pub fn init() {
    utils::set_panic_hook();
}
