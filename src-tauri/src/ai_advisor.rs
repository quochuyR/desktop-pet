use reqwest::Client;
use serde::{Deserialize, Serialize};

const GEMINI_API_URL: &str =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<Content>,
    generation_config: GenerationConfig,
}

#[derive(Debug, Serialize)]
struct Content {
    parts: Vec<Part>,
}

#[derive(Debug, Serialize)]
struct Part {
    text: String,
}

#[derive(Debug, Serialize)]
struct GenerationConfig {
    temperature: f32,
    max_output_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<Candidate>,
}

#[derive(Debug, Deserialize)]
struct Candidate {
    content: ContentResponse,
}

#[derive(Debug, Deserialize)]
struct ContentResponse {
    parts: Vec<PartResponse>,
}

#[derive(Debug, Deserialize)]
struct PartResponse {
    text: String,
}

pub struct AiAdvisor {
    client: Client,
    api_key: String,
}

impl AiAdvisor {
    pub fn new(api_key: String) -> Self {
        AiAdvisor {
            client: Client::new(),
            api_key,
        }
    }

    /// Get a cute advice message from the turtle AI
    pub async fn get_advice(&self, context: &DevContext) -> Result<String, String> {
        if self.api_key.is_empty() || self.api_key == "YOUR_GEMINI_API_KEY" {
            return Ok(self.offline_advice(context));
        }

        let prompt = self.build_prompt(context);

        let request = GeminiRequest {
            contents: vec![Content {
                parts: vec![Part { text: prompt }],
            }],
            generation_config: GenerationConfig {
                temperature: 0.9,
                max_output_tokens: 100,
            },
        };

        let url = format!("{}?key={}", GEMINI_API_URL, self.api_key);

        match self.client.post(&url).json(&request).send().await {
            Ok(response) => {
                if let Ok(data) = response.json::<GeminiResponse>().await {
                    if let Some(candidate) = data.candidates.first() {
                        if let Some(part) = candidate.content.parts.first() {
                            return Ok(part.text.trim().to_string());
                        }
                    }
                }
                Ok(self.offline_advice(context))
            }
            Err(_) => Ok(self.offline_advice(context)),
        }
    }

    fn build_prompt(&self, ctx: &DevContext) -> String {
        format!(
            r#"You are a cute developer companion turtle 🐢 giving friendly advice to a programmer.
Be short (max 2 sentences), funny, and supportive. Use turtle emoji occasionally.
Respond in Vietnamese.

Context:
- Coding for: {} minutes
- File being edited: {}
- Build fails today: {}
- Last commit: {} minutes ago
- Current mood: {}

Give a short, helpful tip or funny comment as the turtle. Keep it under 80 characters."#,
            ctx.coding_minutes,
            ctx.current_file.as_deref().unwrap_or("unknown"),
            ctx.build_fails_today,
            ctx.minutes_since_commit,
            ctx.pet_mood
        )
    }

    /// Offline fallback messages
    fn offline_advice(&self, ctx: &DevContext) -> String {
        let messages = [
            "Code sạch hôm nay, debug ít ngày mai! 🐢",
            "Uống nước đi bạn ơi, não cần hydrate! 💧",
            "Break 5 phút, não sẽ sáng hơn nhiều! 🐢",
            "Commit thường xuyên, tránh đau tim! 📝",
            "Đọc error message kỹ trước khi Google! 🔍",
            "Rubber duck debugging: kể bug cho rùa nghe! 🐢",
        ];

        if ctx.coding_minutes > 120 {
            return "Code 2 tiếng rồi đó... Nghỉ 5 phút thôi bạn ơi! 🐢".to_string();
        }
        if ctx.build_fails_today > 5 {
            return format!(
                "Build fail {} lần rồi... Đọc lại error message đi! 🐢",
                ctx.build_fails_today
            );
        }

        let idx = (ctx.coding_minutes as usize) % messages.len();
        messages[idx].to_string()
    }
}

#[derive(Debug, Clone)]
pub struct DevContext {
    pub coding_minutes: u32,
    pub current_file: Option<String>,
    pub build_fails_today: u32,
    pub minutes_since_commit: u32,
    pub pet_mood: String,
}
