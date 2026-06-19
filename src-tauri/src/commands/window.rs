use tauri::Manager;

#[derive(Debug, serde::Serialize)]
pub struct MonitorLayout {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
}

#[tauri::command]
pub fn move_window(x: f64, y: f64, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let new_x = x.round() as i32;
        let new_y = y.round() as i32;

        #[cfg(target_os = "windows")]
        {
            if let Ok(hwnd) = window.hwnd() {
                unsafe {
                    crate::sys::win32::SetWindowPos(
                        hwnd.0 as *mut std::ffi::c_void,
                        std::ptr::null_mut(),
                        new_x,
                        new_y,
                        0,
                        0,
                        0x0001 | 0x0004 | 0x0010, // SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE
                    );
                }
                return Ok(());
            }
        }

        window
            .set_position(tauri::PhysicalPosition::new(new_x, new_y))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_click_through(enabled: bool, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_ignore_cursor_events(enabled)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_current_monitor_layout(app: tauri::AppHandle) -> Result<Option<MonitorLayout>, String> {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(Some(monitor)) = window.current_monitor() {
            let pos = monitor.position();
            let size = monitor.size();
            let scale_factor = monitor.scale_factor();
            return Ok(Some(MonitorLayout {
                x: pos.x,
                y: pos.y,
                width: size.width,
                height: size.height,
                scale_factor,
            }));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn get_all_monitors(app: tauri::AppHandle) -> Result<Vec<MonitorLayout>, String> {
    let mut layouts = Vec::new();
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(monitors) = window.available_monitors() {
            for monitor in monitors {
                let pos = monitor.position();
                let size = monitor.size();
                layouts.push(MonitorLayout {
                    x: pos.x,
                    y: pos.y,
                    width: size.width,
                    height: size.height,
                    scale_factor: monitor.scale_factor(),
                });
            }
        }
    }
    Ok(layouts)
}
