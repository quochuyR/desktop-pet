// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use desktop_pet_lib::{commands, sys, config, db, dev_monitor, system_monitor, AppState};
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

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            // Register updater plugin in all builds so the UI works correctly
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

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

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("🐢 Desktop Pet")
                .show_menu_on_left_click(false);

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        if let Some(state) = app.try_state::<AppState>() {
                            if let (Ok(pet), Ok(db), Ok(mut monitor)) = (state.pet.lock(), state.db.lock(), state.monitor.lock()) {
                                let _ = db.save_pet(&pet);
                                if let Some((prev_proc, prev_title, active_app_since, active_app_start_time)) = monitor.current_app_usage.take() {
                                    let duration = active_app_since.elapsed().as_secs();
                                    if duration > 0 {
                                        let _ = db.log_app_usage(&prev_proc, &prev_title, &active_app_start_time, duration);
                                    }
                                }
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
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("window-visibility", true);
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
                sys::win32::run_win_event_listener(app_handle_hook);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pet::get_pet_stats,
            commands::pet::pet_clicked,
            commands::dev::get_dev_status,
            commands::dev::update_watch_path,
            commands::ai::get_ai_advice,
            commands::ai::get_ai_advice_auto,
            commands::window::move_window,
            commands::system::log_js,
            commands::system::get_physical_cursor_position,
            commands::window::toggle_click_through,
            commands::config::get_config_info,
            commands::db::db_log_custom_event,
            commands::db::db_get_kv,
            commands::db::db_set_kv,
            commands::db::db_load_personality,
            commands::db::db_save_personality,
            commands::db::db_get_app_usage,
            commands::db::db_get_app_usage_summary,
            commands::window::get_current_monitor_layout,
            commands::window::get_all_monitors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
