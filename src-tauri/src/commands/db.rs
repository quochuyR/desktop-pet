use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn db_log_custom_event(
    event_type: String,
    details: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.log_event(&event_type, details.as_deref())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_kv(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_kv(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_set_kv(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_kv(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_load_personality(state: State<'_, AppState>) -> Result<(f32, f32, f32), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_personality().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_save_personality(
    friendly: f32,
    helpful: f32,
    funny: f32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.save_personality(friendly, helpful, funny)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_get_app_usage(
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<crate::db::AppUsageEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_app_usage(limit.unwrap_or(50))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_get_app_usage_summary(
    days: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<crate::db::AppUsageSummary>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_app_usage_summary(days.unwrap_or(7))
        .map_err(|e| e.to_string())
}
