use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Default)]
pub struct AppConfig {
    pub ai: Option<AiConfig>,
    pub monitoring: Option<MonitoringConfig>,
    pub pet: Option<PetConfig>,
}

#[derive(Debug, Deserialize, Default)]
pub struct AiConfig {
    pub gemini_api_key: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct MonitoringConfig {
    pub watch_paths: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Default)]
pub struct PetConfig {
    pub name: Option<String>,
}

impl AppConfig {
    /// Load config from config.toml next to the executable
    pub fn load() -> Self {
        // Try multiple locations for config.toml
        let candidates = Self::config_candidates();

        for path in &candidates {
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(path) {
                    match toml::from_str::<AppConfig>(&content) {
                        Ok(cfg) => {
                            log::info!("Loaded config from: {}", path.display());
                            return cfg;
                        }
                        Err(e) => {
                            log::warn!("Failed to parse config at {}: {}", path.display(), e);
                        }
                    }
                }
            }
        }

        log::info!("No config.toml found, using defaults");
        AppConfig::default()
    }

    fn config_candidates() -> Vec<PathBuf> {
        let mut paths = Vec::new();

        // 1. Next to executable (production)
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                paths.push(dir.join("config.toml"));
            }
        }

        // 2. Current working directory (dev mode)
        if let Ok(cwd) = std::env::current_dir() {
            paths.push(cwd.join("config.toml"));
            // Go up one level (src-tauri parent = project root)
            if let Some(parent) = cwd.parent() {
                paths.push(parent.join("config.toml"));
            }
        }

        // 3. App data directory
        if let Some(data_dir) = dirs::data_dir() {
            paths.push(data_dir.join("desktop-pet").join("config.toml"));
        }

        paths
    }

    pub fn gemini_key(&self) -> String {
        self.ai
            .as_ref()
            .and_then(|a| a.gemini_api_key.clone())
            .unwrap_or_default()
    }

    pub fn pet_name(&self) -> String {
        self.pet
            .as_ref()
            .and_then(|p| p.name.clone())
            .unwrap_or_else(|| "Rùa Dev".to_string())
    }
}
