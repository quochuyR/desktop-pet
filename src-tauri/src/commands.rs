use crate::ai_advisor::{AiAdvisor, DevContext};
use crate::pet_state::PetEvent;
use crate::AppState;
use serde::Serialize;
use std::sync::mpsc;
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};

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

#[derive(Debug, Serialize)]
pub struct DevStatusResponse {
    pub active_tool: Option<String>,
    pub watched_paths: Vec<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct ConfigInfoResponse {
    pub ai_enabled: bool,
    pub pet_name: String,
}

/// Get current pet stats
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

/// Handle pet being clicked
#[tauri::command]
pub fn pet_clicked(state: State<AppState>) -> Result<String, String> {
    let mut pet = state.pet.lock().map_err(|e| e.to_string())?;
    let reactions = pet.handle_event(PetEvent::Clicked);

    // Cute click responses
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

/// Get developer tool status
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

/// Update the watched directory path
#[tauri::command]
pub fn update_watch_path(path: String, state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_watched_path(&path, Some("user"))
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get AI advice — uses provided API key (manual override)
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

/// Get AI advice — uses API key from config.toml automatically
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

/// Get config info (is AI enabled, pet name)
#[tauri::command]
pub fn get_config_info(state: State<AppState>) -> ConfigInfoResponse {
    ConfigInfoResponse {
        ai_enabled: !state.gemini_key.is_empty(),
        pet_name: state.pet_name.clone(),
    }
}

/// Move the window to absolute position (called from frontend drag, uses physical coordinates directly)
#[tauri::command]
pub fn move_window(x: f64, y: f64, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let new_x = x.round() as i32;
        let new_y = y.round() as i32;

        #[cfg(target_os = "windows")]
        {
            if let Ok(hwnd) = window.hwnd() {
                unsafe {
                    win32::SetWindowPos(
                        hwnd.0 as *mut std::ffi::c_void,
                        std::ptr::null_mut(),
                        new_x,
                        new_y,
                        0,
                        0,
                        0x0001 | 0x0004 | 0x0010, // SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE
                    );
                }
                return Ok(());
            }
        }

        window
            .set_position(tauri::PhysicalPosition::new(new_x, new_y))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Helper command to log messages from Svelte frontend to Rust stdout
#[tauri::command]
pub fn log_js(_message: String) {
    // println!("[JS] {}", message);
}

#[cfg(target_os = "windows")]
#[allow(non_snake_case, dead_code)]
mod win32 {
    #[repr(C)]
    pub struct POINT {
        pub x: i32,
        pub y: i32,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct RECT {
        pub left: i32,
        pub top: i32,
        pub right: i32,
        pub bottom: i32,
    }

    #[repr(C)]
    pub struct MSG {
        pub hwnd: *mut std::ffi::c_void,
        pub message: u32,
        pub wParam: usize,
        pub lParam: isize,
        pub time: u32,
        pub pt: POINT,
    }

    pub type WINEVENTPROC = Option<
        unsafe extern "system" fn(
            hWinEventHook: *mut std::ffi::c_void,
            event: u32,
            hwnd: *mut std::ffi::c_void,
            idObject: i32,
            idChild: i32,
            idEventThread: u32,
            dwmsEventTime: u32,
        ),
    >;

    pub type WNDENUMPROC =
        Option<unsafe extern "system" fn(hwnd: *mut std::ffi::c_void, lParam: isize) -> i32>;

    #[link(name = "user32")]
    extern "system" {
        pub fn GetCursorPos(lpPoint: *mut POINT) -> i32;
        pub fn GetForegroundWindow() -> *mut std::ffi::c_void;
        pub fn GetWindowRect(hwnd: *mut std::ffi::c_void, lpRect: *mut RECT) -> i32;
        pub fn GetWindowThreadProcessId(
            hwnd: *mut std::ffi::c_void,
            lpdwProcessId: *mut u32,
        ) -> u32;
        pub fn GetClassNameW(
            hwnd: *mut std::ffi::c_void,
            lpClassName: *mut u16,
            nMaxCount: i32,
        ) -> i32;
        pub fn IsIconic(hwnd: *mut std::ffi::c_void) -> i32;
        pub fn IsWindowVisible(hwnd: *mut std::ffi::c_void) -> i32;
        pub fn GetWindowTextW(
            hwnd: *mut std::ffi::c_void,
            lpString: *mut u16,
            nMaxCount: i32,
        ) -> i32;
        pub fn EnumWindows(lpEnumFunc: WNDENUMPROC, lParam: isize) -> i32;

        pub fn SetWinEventHook(
            eventMin: u32,
            eventMax: u32,
            hmodWinEventProc: *mut std::ffi::c_void,
            pfnWinEventProc: WINEVENTPROC,
            idProcess: u32,
            idThread: u32,
            dwFlags: u32,
        ) -> *mut std::ffi::c_void;

        pub fn UnhookWinEvent(hWinEventHook: *mut std::ffi::c_void) -> i32;

        pub fn GetMessageW(
            lpMsg: *mut std::ffi::c_void,
            hWnd: *mut std::ffi::c_void,
            wMsgFilterMin: u32,
            wMsgFilterMax: u32,
        ) -> i32;

        pub fn SetWindowPos(
            hWnd: *mut std::ffi::c_void,
            hWndInsertAfter: *mut std::ffi::c_void,
            X: i32,
            Y: i32,
            cx: i32,
            cy: i32,
            uFlags: u32,
        ) -> i32;
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct WindowPlatform {
    pub id: String,
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
    pub title: String,
    pub class_name: String,
}

static UPDATE_SENDER: OnceLock<mpsc::Sender<()>> = OnceLock::new();

#[cfg(target_os = "windows")]
fn trigger_platform_update() {
    if let Some(tx) = UPDATE_SENDER.get() {
        let _ = tx.send(());
    }
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn win_event_proc(
    _h_win_event_hook: *mut std::ffi::c_void,
    _event: u32,
    _hwnd: *mut std::ffi::c_void,
    id_object: i32,
    _id_child: i32,
    _id_event_thread: u32,
    _dwms_event_time: u32,
) {
    if id_object >= 0 || id_object == -4 {
        trigger_platform_update();
    }
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_windows_callback(hwnd: *mut std::ffi::c_void, lparam: isize) -> i32 {
    let list = &mut *(lparam as *mut Vec<WindowPlatform>);

    if win32::IsWindowVisible(hwnd) == 0 || win32::IsIconic(hwnd) != 0 {
        return 1;
    }

    // Exclude our own process
    let mut pid: u32 = 0;
    win32::GetWindowThreadProcessId(hwnd, &mut pid);
    if pid == std::process::id() {
        return 1;
    }

    // Class name check (ignore desktop backgrounds)
    let mut class_buf = [0u16; 256];
    let len = win32::GetClassNameW(hwnd, class_buf.as_mut_ptr(), 256);
    let class_name = if len > 0 {
        String::from_utf16_lossy(&class_buf[..len as usize])
    } else {
        String::new()
    };

    if class_name == "Progman" || class_name == "WorkerW" {
        return 1;
    }

    // Window Text/Title check
    let mut text_buf = [0u16; 256];
    let text_len = win32::GetWindowTextW(hwnd, text_buf.as_mut_ptr(), 256);
    let title = if text_len > 0 {
        String::from_utf16_lossy(&text_buf[..text_len as usize])
    } else {
        String::new()
    };

    let mut rect = win32::RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    if win32::GetWindowRect(hwnd, &mut rect) != 0 {
        let w = rect.right - rect.left;
        let h = rect.bottom - rect.top;
        if w > 100 && h > 100 {
            list.push(WindowPlatform {
                id: format!("{:?}", hwnd),
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                title,
                class_name,
            });
        }
    }

    1
}

#[cfg(target_os = "windows")]
fn update_platforms(app_handle: &tauri::AppHandle) {
    let mut platforms = Vec::new();
    unsafe {
        win32::EnumWindows(
            Some(enum_windows_callback),
            &mut platforms as *mut Vec<WindowPlatform> as isize,
        );
    }
    // Emit to frontend
    let _ = app_handle.emit("window_platforms_update", &platforms);
}

pub fn run_win_event_listener(app_handle: tauri::AppHandle) {
    #[cfg(target_os = "windows")]
    {
        let app_handle_clone = app_handle.clone();

        // Spawn worker thread for throttled updates
        std::thread::spawn(move || {
            let (tx, rx) = mpsc::channel();
            if UPDATE_SENDER.set(tx).is_ok() {
                let mut last_run = Instant::now() - Duration::from_millis(500);

                // Initial run
                update_platforms(&app_handle_clone);

                // Spawn fallback polling loop every 1s
                std::thread::spawn(move || loop {
                    std::thread::sleep(Duration::from_secs(1));
                    trigger_platform_update();
                });

                let mut last_active_app: Option<(String, String)> = None;
                let mut active_app_since = Instant::now();
                let mut active_app_start_time =
                    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

                loop {
                    if rx.recv().is_ok() {
                        // Drain any pending updates in the queue
                        while rx.try_recv().is_ok() {}

                        let now = Instant::now();
                        let elapsed = now.duration_since(last_run);
                        if elapsed < Duration::from_millis(33) {
                            std::thread::sleep(Duration::from_millis(33) - elapsed);
                        }

                        update_platforms(&app_handle_clone);

                        // Event-driven foreground app tracking
                        if let Some((curr_proc, curr_title)) =
                            crate::dev_monitor::win32::get_active_window_info()
                        {
                            let changed = match &last_active_app {
                                Some((prev_proc, prev_title)) => {
                                    prev_proc != &curr_proc || prev_title != &curr_title
                                }
                                None => true,
                            };

                            if changed {
                                if let Some(state) = app_handle_clone.try_state::<AppState>() {
                                    // Log previous app focus duration
                                    if let Some((prev_proc, prev_title)) = last_active_app.take() {
                                        let duration = active_app_since.elapsed().as_secs();
                                        if duration > 0 {
                                            if let Ok(db) = state.db.lock() {
                                                let _ = db.log_app_usage(
                                                    &prev_proc,
                                                    &prev_title,
                                                    &active_app_start_time,
                                                    duration,
                                                );
                                            }
                                        }
                                    }

                                    // Show cute message when focusing new app (exclude desktop-pet itself)
                                    let display_name =
                                        curr_proc.strip_suffix(".exe").unwrap_or(&curr_proc);
                                    let lowercase_name = curr_proc.to_lowercase();

                                    if !lowercase_name.contains("desktop-pet")
                                        && !lowercase_name.contains("desktop_pet")
                                    {
                                        let msg = if lowercase_name.contains("code") {
                                            "Chủ nhân mở VS Code gõ code kìa! Tập trung gõ code thôi! 💻🐢".to_string()
                                        } else if lowercase_name.contains("chrome") {
                                            "Đang lướt web tìm tài liệu trên Chrome đúng hông? 🌐🐢"
                                                .to_string()
                                        } else if lowercase_name.contains("msedge") {
                                            "Lướt Edge tìm giải pháp fix bug hả chủ nhân? 🌐🐢"
                                                .to_string()
                                        } else if lowercase_name.contains("cmd")
                                            || lowercase_name.contains("powershell")
                                            || lowercase_name.contains("terminal")
                                        {
                                            "Mở Terminal gõ lệnh gì ngầu vậy chủ nhân ơi? 💻🐢"
                                                .to_string()
                                        } else if lowercase_name.contains("discord") {
                                            "Có cuộc gọi hay tin nhắn mới trên Discord kìa! 💬🐢"
                                                .to_string()
                                        } else if lowercase_name.contains("slack") {
                                            "Slack có tin nhắn công việc kìa chủ nhân ơi! 💬🐢"
                                                .to_string()
                                        } else if lowercase_name.contains("spotify") {
                                            "Nghe nhạc Spotify chill chill rồi code tiếp nha! 🎵🐢"
                                                .to_string()
                                        } else {
                                            format!(
                                                "Chủ nhân đang mở ứng dụng {} kìa! 🕵️‍♂️🐢",
                                                display_name
                                            )
                                        };
                                        let _ = app_handle_clone.emit("pet_message", msg);
                                    }
                                }

                                // Set new active app
                                last_active_app = Some((curr_proc, curr_title));
                                active_app_since = Instant::now();
                                active_app_start_time =
                                    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                            }
                        } else {
                            // No window focused (e.g. lock screen), log previous app focus if any
                            if let Some((prev_proc, prev_title)) = last_active_app.take() {
                                let duration = active_app_since.elapsed().as_secs();
                                if duration > 0 {
                                    if let Some(state) = app_handle_clone.try_state::<AppState>() {
                                        if let Ok(db) = state.db.lock() {
                                            let _ = db.log_app_usage(
                                                &prev_proc,
                                                &prev_title,
                                                &active_app_start_time,
                                                duration,
                                            );
                                        }
                                    }
                                }
                            }
                        }

                        last_run = Instant::now();
                    }
                }
            }
        });

        unsafe {
            // Hook window foreground change
            let hook_foreground = win32::SetWinEventHook(
                0x0003, // EVENT_SYSTEM_FOREGROUND
                0x0003,
                std::ptr::null_mut(),
                Some(win_event_proc),
                0,
                0,
                0, // WINEVENT_OUTOFCONTEXT
            );

            // Hook window location changes (resize/drag)
            let hook_location = win32::SetWinEventHook(
                0x800B, // EVENT_OBJECT_LOCATIONCHANGE
                0x800B,
                std::ptr::null_mut(),
                Some(win_event_proc),
                0,
                0,
                0,
            );

            // Hook window minimization & restoration
            let hook_state = win32::SetWinEventHook(
                0x0016, // EVENT_SYSTEM_MINIMIZESTART
                0x0017, // EVENT_SYSTEM_MINIMIZEEND
                std::ptr::null_mut(),
                Some(win_event_proc),
                0,
                0,
                0,
            );

            // Hook window show/hide/destroy
            let hook_destroy = win32::SetWinEventHook(
                0x8001, // EVENT_OBJECT_DESTROY
                0x8003, // EVENT_OBJECT_HIDE
                std::ptr::null_mut(),
                Some(win_event_proc),
                0,
                0,
                0,
            );

            // Message pump
            let mut msg = win32::MSG {
                hwnd: std::ptr::null_mut(),
                message: 0,
                wParam: 0,
                lParam: 0,
                time: 0,
                pt: win32::POINT { x: 0, y: 0 },
            };

            while win32::GetMessageW(
                &mut msg as *mut win32::MSG as *mut std::ffi::c_void,
                std::ptr::null_mut(),
                0,
                0,
            ) > 0
            {}

            // Cleanup hooks
            if !hook_foreground.is_null() {
                win32::UnhookWinEvent(hook_foreground);
            }
            if !hook_location.is_null() {
                win32::UnhookWinEvent(hook_location);
            }
            if !hook_state.is_null() {
                win32::UnhookWinEvent(hook_state);
            }
            if !hook_destroy.is_null() {
                win32::UnhookWinEvent(hook_destroy);
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn run_win_event_listener(_app_handle: tauri::AppHandle) {}

/// Get physical cursor position on screen (deadlock-free via Win32 on Windows)
#[tauri::command]
pub fn get_physical_cursor_position() -> Result<(f64, f64), String> {
    #[cfg(target_os = "windows")]
    {
        let mut pt = win32::POINT { x: 0, y: 0 };
        unsafe {
            if win32::GetCursorPos(&mut pt) != 0 {
                return Ok((pt.x as f64, pt.y as f64));
            }
        }
        Err("Failed to get cursor position via Win32".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Unsupported OS".to_string())
    }
}

/// Toggle click-through mode (ignore cursor events when not hovering)
#[tauri::command]
pub fn toggle_click_through(enabled: bool, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_ignore_cursor_events(enabled)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Log a custom event from frontend to SQLite database
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

/// Get a key-value pair from agent_kv SQLite table
#[tauri::command]
pub fn db_get_kv(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_kv(&key).map_err(|e| e.to_string())
}

/// Set/save a key-value pair in agent_kv SQLite table
#[tauri::command]
pub fn db_set_kv(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_kv(&key, &value).map_err(|e| e.to_string())
}

/// Load pet dynamic personality index
#[tauri::command]
pub fn db_load_personality(state: State<'_, AppState>) -> Result<(f32, f32, f32), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_personality().map_err(|e| e.to_string())
}

/// Save pet dynamic personality index
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

/// Retrieve background application usage statistics
#[tauri::command]
pub fn db_get_app_usage(
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<crate::db::AppUsageEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_app_usage(limit.unwrap_or(50))
        .map_err(|e| e.to_string())
}

/// Retrieve aggregated application usage statistics
#[tauri::command]
pub fn db_get_app_usage_summary(
    days: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<crate::db::AppUsageSummary>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_app_usage_summary(days.unwrap_or(7))
        .map_err(|e| e.to_string())
}

#[derive(Debug, serde::Serialize)]
pub struct MonitorLayout {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
}

#[tauri::command]
pub fn get_current_monitor_layout(app: tauri::AppHandle) -> Result<Option<MonitorLayout>, String> {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(Some(monitor)) = window.current_monitor() {
            let pos = monitor.position();
            let size = monitor.size();
            let scale_factor = monitor.scale_factor();
            return Ok(Some(MonitorLayout {
                x: pos.x,
                y: pos.y,
                width: size.width,
                height: size.height,
                scale_factor,
            }));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn get_all_monitors(app: tauri::AppHandle) -> Result<Vec<MonitorLayout>, String> {
    let mut layouts = Vec::new();
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(monitors) = window.available_monitors() {
            for monitor in monitors {
                let pos = monitor.position();
                let size = monitor.size();
                layouts.push(MonitorLayout {
                    x: pos.x,
                    y: pos.y,
                    width: size.width,
                    height: size.height,
                    scale_factor: monitor.scale_factor(),
                });
            }
        }
    }
    Ok(layouts)
}
