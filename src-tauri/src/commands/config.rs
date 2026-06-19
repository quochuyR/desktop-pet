use crate::AppState;
use tauri::State;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ConfigInfoResponse {
    pub ai_enabled: bool,
    pub pet_name: String,
}

#[tauri::command]
pub fn get_config_info(state: State<AppState>) -> ConfigInfoResponse {
    ConfigInfoResponse {
        ai_enabled: !state.gemini_key.is_empty(),
        pet_name: state.pet_name.clone(),
    }
}
