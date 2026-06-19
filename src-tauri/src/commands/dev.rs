use crate::AppState;
use tauri::State;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DevStatusResponse {
    pub active_tool: Option<String>,
    pub watched_paths: Vec<String>,
    pub is_active: bool,
}

#[tauri::command]
pub fn get_dev_status(state: State<AppState>) -> Result<DevStatusResponse, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let paths = db.get_watched_paths().unwrap_or_default();

    Ok(DevStatusResponse {
        active_tool: monitor.get_active_tool(),
        watched_paths: paths,
        is_active: monitor
            .last_event_time
            .map(|t| t.elapsed().as_secs() < 300)
            .unwrap_or(false),
    })
}

#[tauri::command]
pub fn update_watch_path(path: String, state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_watched_path(&path, Some("user"))
        .map_err(|e| e.to_string())?;
    Ok(())
}
