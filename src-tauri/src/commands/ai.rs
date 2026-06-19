use crate::AppState;
use tauri::State;
use crate::ai_advisor::{AiAdvisor, DevContext};

#[tauri::command]
pub async fn get_ai_advice(
    api_key: String,
    coding_minutes: u32,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let (mood, build_fails) = {
        let pet = state.pet.lock().map_err(|e| e.to_string())?;
        (pet.mood.as_str().to_string(), pet.total_build_fail)
    };

    let advisor = AiAdvisor::new(api_key);
    let ctx = DevContext {
        coding_minutes,
        current_file: None,
        build_fails_today: build_fails,
        minutes_since_commit: 0,
        pet_mood: mood,
    };
    advisor.get_advice(&ctx).await
}

#[tauri::command]
pub async fn get_ai_advice_auto(
    coding_minutes: u32,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let (mood, build_fails, key) = {
        let pet = state.pet.lock().map_err(|e| e.to_string())?;
        (
            pet.mood.as_str().to_string(),
            pet.total_build_fail,
            state.gemini_key.clone(),
        )
    };

    let advisor = AiAdvisor::new(key);
    let ctx = DevContext {
        coding_minutes,
        current_file: None,
        build_fails_today: build_fails,
        minutes_since_commit: 0,
        pet_mood: mood,
    };
    advisor.get_advice(&ctx).await
}
