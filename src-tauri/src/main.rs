// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(mobile))]
fn main() {
    fulgul_lib::run()
}

#[cfg(mobile)]
#[no_mangle]
#[inline(never)]
pub extern "C" fn main() {
    fulgul_lib::run()
}
