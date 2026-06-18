// lib.rs — Shared types and modules for the Desktop Pet Tauri app

pub mod ai_advisor;
pub mod commands;
pub mod config;
pub mod db;
pub mod dev_monitor;
pub mod pet_state;
pub mod system_monitor;

use std::sync::{Arc, Mutex};

/// Shared application state managed by Tauri
pub struct AppState {
    pub pet: Arc<Mutex<pet_state::PetState>>,
    pub db: Arc<Mutex<db::Database>>,
    pub monitor: Arc<Mutex<dev_monitor::DevMonitor>>,
    pub gemini_key: String,
    pub pet_name: String,
}
