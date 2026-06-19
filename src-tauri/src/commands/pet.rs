use crate::pet_state::PetEvent;
use crate::AppState;
use tauri::State;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PetStatsResponse {
    pub hp: f32,
    pub energy: f32,
    pub iq: f32,
    pub exp: u32,
    pub level: u32,
    pub total_commits: u32,
    pub total_bug_fixes: u32,
    pub coding_streak_days: u32,
    pub career_name: String,
    pub career_level: String,
    pub mood: String,
    pub active_tool: Option<String>,
    pub consecutive_build_fails: u32,
}

#[tauri::command]
pub fn get_pet_stats(state: State<AppState>) -> Result<PetStatsResponse, String> {
    let pet = state.pet.lock().map_err(|e| e.to_string())?;
    Ok(PetStatsResponse {
        hp: pet.hp,
        energy: pet.energy,
        iq: pet.iq,
        exp: pet.exp,
        level: pet.level,
        total_commits: pet.total_commits,
        total_bug_fixes: pet.total_bug_fixes,
        coding_streak_days: pet.coding_streak_days,
        career_name: pet.career.display_name().to_string(),
        career_level: pet.career.as_str().to_string(),
        mood: pet.mood.as_str().to_string(),
        active_tool: pet.active_tool.clone(),
        consecutive_build_fails: pet.consecutive_build_fails,
    })
}

#[tauri::command]
pub fn pet_clicked(state: State<AppState>) -> Result<String, String> {
    let mut pet = state.pet.lock().map_err(|e| e.to_string())?;
    let reactions = pet.handle_event(PetEvent::Clicked);

    let click_responses = [
        "Đừng chọc tôi! 🐢",
        "Tôi đang làm việc đây! 💻",
        "Ôi! 🐢✨",
        "Bạn muốn gì? 👀",
        "Hôm nay code được không? 😄",
        "Commit đi rồi tôi mới vui! 📝",
    ];

    let mut message = click_responses[(std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as usize)
        % click_responses.len()]
    .to_string();

    for reaction in reactions {
        if let crate::pet_state::PetReaction::Message(msg) = reaction {
            message = msg;
            break;
        }
    }
    Ok(message)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pet_stats_response_serialize() {
        let stats = PetStatsResponse {
            hp: 100.0,
            energy: 100.0,
            iq: 50.0,
            exp: 10,
            level: 1,
            total_commits: 5,
            total_bug_fixes: 2,
            coding_streak_days: 3,
            career_name: "Thực tập sinh".to_string(),
            career_level: "intern".to_string(),
            mood: "happy".to_string(),
            active_tool: Some("vscode".to_string()),
            consecutive_build_fails: 0,
        };

        let serialized = serde_json::to_string(&stats).unwrap();
        assert!(serialized.contains("hp"));
        assert!(serialized.contains("Thực tập sinh"));
    }
}
