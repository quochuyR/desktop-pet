// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use desktop_pet_lib::{commands, config, db, dev_monitor, system_monitor, AppState};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

fn main() {
    env_logger::init();

    // Load user config (API key, watch paths, pet name)
    let cfg = config::AppConfig::load();
    let gemini_key = cfg.gemini_key();
    let pet_name = cfg.pet_name();

    if !gemini_key.is_empty() {
        log::info!("Gemini AI: enabled ✓ (key loaded from config.toml)");
    } else {
        log::info!("Gemini AI: no key found, using offline messages");
    }

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init());

    // Only register the updater in release builds — suppresses the
    // "update endpoint did not respond" error noise during development.
    #[cfg(not(debug_assertions))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            // ── Initialize state ────────────────────────────────────
            let db = db::Database::new().expect("Failed to init database");
            let pet = db.load_pet().unwrap_or_default();

            // Load any configured watch paths into DB
            if let Some(mon_cfg) = cfg.monitoring.as_ref() {
                if let Some(paths) = &mon_cfg.watch_paths {
                    for path in paths {
                        let _ = db.add_watched_path(path, Some("config"));
                    }
                }
            }

            let app_state = AppState {
                pet: Arc::new(Mutex::new(pet)),
                db: Arc::new(Mutex::new(db)),
                monitor: Arc::new(Mutex::new(dev_monitor::DevMonitor::new())),
                gemini_key: gemini_key.clone(),
                pet_name: pet_name.clone(),
            };
            app.manage(app_state);

            // ── System tray ─────────────────────────────────────────
            let show_item = MenuItem::with_id(app, "show", "Show Pet 🐢", true, None::<&str>)?;
            let stats_item = MenuItem::with_id(app, "stats", "Stats 📊", true, None::<&str>)?;
            let decorate_item =
                MenuItem::with_id(app, "decorate", "Decorate Pet 🎨", true, None::<&str>)?;
            let update_item =
                MenuItem::with_id(app, "update", "Check Updates 🚀", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &show_item,
                    &stats_item,
                    &decorate_item,
                    &update_item,
                    &sep,
                    &quit_item,
                ],
            )?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("🐢 Desktop Pet")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        if let Some(state) = app.try_state::<AppState>() {
                            if let (Ok(pet), Ok(db)) = (state.pet.lock(), state.db.lock()) {
                                let _ = db.save_pet(&pet);
                            }
                        }
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("window-visibility", true);
                        }
                    }
                    "stats" => {
                        let _ = app.emit("show_stats", ());
                    }
                    "decorate" => {
                        let _ = app.emit("show_decorate", ());
                    }
                    "update" => {
                        let _ = app.emit("show_update", ());
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let visible = window.is_visible().unwrap_or(false);
                            if visible {
                                let _ = window.hide();
                                let _ = window.emit("window-visibility", false);
                            } else {
                                let _ = window.show();
                                let _ = window.emit("window-visibility", true);
                            }
                        }
                    }
                })
                .build(app)?;

            // ── Start background monitoring ──────────────────────────
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                system_monitor::start_monitoring(app_handle).await;
            });

            // Start win32 event listener for visible window platform updates
            let app_handle_hook = app.handle().clone();
            std::thread::spawn(move || {
                commands::run_win_event_listener(app_handle_hook);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_pet_stats,
            commands::pet_clicked,
            commands::get_dev_status,
            commands::update_watch_path,
            commands::get_ai_advice,
            commands::get_ai_advice_auto,
            commands::move_window,
            commands::log_js,
            commands::get_physical_cursor_position,
            commands::toggle_click_through,
            commands::get_config_info,
            commands::db_log_custom_event,
            commands::db_get_kv,
            commands::db_set_kv,
            commands::db_load_personality,
            commands::db_save_personality,
            commands::db_get_app_usage,
            commands::db_get_app_usage_summary,
            commands::get_current_monitor_layout,
            commands::get_all_monitors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
