
#[tauri::command]
pub fn get_physical_cursor_position() -> Result<(f64, f64), String> {
    #[cfg(target_os = "windows")]
    {
        let mut pt = crate::sys::win32::POINT { x: 0, y: 0 };
        unsafe {
            if crate::sys::win32::GetCursorPos(&mut pt) != 0 {
                return Ok((pt.x as f64, pt.y as f64));
            }
        }
        Err("Failed to get cursor position via Win32".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Unsupported OS".to_string())
    }
}

#[tauri::command]
pub fn log_js(_message: String) {
    // println!("[JS] {}", message);
}
