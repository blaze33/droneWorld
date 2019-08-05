mod utils;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

extern crate serde_wasm_bindgen;
extern crate png;
// extern crate image;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(v: String);

    #[wasm_bindgen(js_namespace = console, js_name=log)]
    fn log_js(v: &JsValue);

    // #[wasm_bindgen(js_namespace = console, js_name=log)]
    // fn log_vec(v: &);
}

#[wasm_bindgen]
pub fn png2mesh(png_bytes: &[u8]) -> JsValue {
    // decode raw bytes and check we have a 256x256px image
    let decoder = png::Decoder::new(png_bytes);
    let (info, mut reader) = decoder.read_info().unwrap();
    assert_eq!(info.buffer_size(), 256 * 256 * 3);

    // Allocate the output buffer.
    let mut buf = vec![0; info.buffer_size()];
    // Read the next frame. Currently this function should only called once.
    reader.next_frame(&mut buf).unwrap();


    // let buf = match image::load_from_memory(png_bytes) {
    //     Ok(i) => i.to_rgb(),
    //     Err(e) => {
    //         log(e.to_string());
    //         return JsValue::null();
    //     }
    // };

    let elevation: Vec<f32> = buf.chunks(3)
        .map(|rgb| rgb[0] as f32 * 256.0 + rgb[1] as f32 + rgb[2] as f32 / 256.0 - 32768.0)
        .collect();
    serde_wasm_bindgen::to_value(&elevation).unwrap()

}
