use chrono::Timelike;
use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use sysinfo::{ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Manager};

use crate::pet_state::{PetEvent, PetReaction};
use crate::AppState;

#[cfg(target_os = "windows")]
pub mod win32 {
    use std::os::raw::c_void;

    pub type HWND = *mut c_void;
    pub type HANDLE = *mut c_void;
    pub type DWORD = u32;
    pub type LPWSTR = *mut u16;
    pub type BOOL = i32;

    #[link(name = "user32")]
    extern "system" {
        pub fn GetForegroundWindow() -> HWND;
        pub fn GetWindowThreadProcessId(hwnd: HWND, lpdwProcessId: *mut DWORD) -> DWORD;
        pub fn GetWindowTextW(hWnd: HWND, lpString: LPWSTR, nMaxCount: i32) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        pub fn OpenProcess(
            dwDesiredAccess: DWORD,
            bInheritHandle: BOOL,
            dwProcessId: DWORD,
        ) -> HANDLE;
        pub fn CloseHandle(hObject: HANDLE) -> BOOL;
        pub fn QueryFullProcessImageNameW(
            hProcess: HANDLE,
            dwFlags: DWORD,
            lpExeName: LPWSTR,
            lpdwSize: *mut DWORD,
        ) -> BOOL;
    }

    const PROCESS_QUERY_LIMITED_INFORMATION: DWORD = 0x1000;

    pub fn get_active_window_info() -> Option<(String, String)> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                return None;
            }

            // Get window title
            let mut title_buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 512);
            let title = if len > 0 {
                String::from_utf16_lossy(&title_buf[..len as usize])
            } else {
                String::new()
            };

            // Get process ID
            let mut pid: DWORD = 0;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 {
                return Some(("unknown".to_string(), title));
            }

            // Open process
            let process_handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if process_handle.is_null() {
                return Some(("unknown".to_string(), title));
            }

            // Get process image name
            let mut path_buf = [0u16; 1024];
            let mut size: DWORD = 1024;
            let ok =
                QueryFullProcessImageNameW(process_handle, 0, path_buf.as_mut_ptr(), &mut size);
            CloseHandle(process_handle);

            let process_name = if ok != 0 {
                let path = String::from_utf16_lossy(&path_buf[..size as usize]);
                std::path::Path::new(&path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string()
            } else {
                "unknown".to_string()
            };

            Some((process_name, title))
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod win32 {
    pub fn get_active_window_info() -> Option<(String, String)> {
        None
    }
}

/// Known developer tools to detect by process name
const DEV_PROCESSES: &[(&str, &str)] = &[
    ("flutter", "Flutter"),
    ("dart", "Dart"),
    ("cargo", "Cargo/Rust"),
    ("gradle", "Gradle"),
    ("code", "VS Code"),
    ("idea64", "IntelliJ"),
    ("studio64", "Android Studio"),
    ("node", "Node.js"),
    ("python", "Python"),
    ("java", "Java"),
];

pub struct DevMonitor {
    pub active_processes: HashSet<String>,
    pub last_event_time: Option<Instant>,
    pub current_app_usage: Option<(String, String, Instant, String)>, // (process, title, since, start_time_str)
}

impl DevMonitor {
    pub fn new() -> Self {
        DevMonitor {
            active_processes: HashSet::new(),
            last_event_time: Some(Instant::now()),
            current_app_usage: None,
        }
    }

    pub fn get_active_tool(&self) -> Option<String> {
        for (process, name) in DEV_PROCESSES {
            if self.active_processes.contains(*process) {
                return Some(name.to_string());
            }
        }
        None
    }
}

/// Main monitoring loop — runs forever in background task.
/// We extract Arc clones upfront to avoid borrow lifetime issues with `app.state()`.
pub async fn start_monitoring(app: AppHandle) {
    log::info!("🐢 Dev monitoring started");

    // ── Extract owned Arc references once ──────────────────────────
    // `app.state()` returns a temporary; clone the inner Arcs so we
    // can use them freely across await points without borrow issues.
    let (pet_arc, db_arc, monitor_arc) = {
        let s = app.state::<AppState>();
        (s.pet.clone(), s.db.clone(), s.monitor.clone())
    };

    let mut sys = System::new_all();
    let mut last_process_check = Instant::now();
    let mut last_idle_check = Instant::now();
    let mut last_save = Instant::now();
    let mut coding_start: Option<Instant> = None;
    let mut idle_minutes: u32 = 0;
    let mut current_session_id: Option<i64> = None;

    let mut last_loop_tick = Instant::now();

    // ── File system watcher ────────────────────────────────────────
    let (tx, rx) = std::sync::mpsc::channel::<notify::Result<Event>>();
    let mut watcher = recommended_watcher(tx).expect("Failed to create file watcher");

    if let Ok(db) = db_arc.lock() {
        if let Ok(paths) = db.get_watched_paths() {
            for path in paths {
                let p = std::path::PathBuf::from(&path);
                if p.exists() {
                    let _ = watcher.watch(&p, RecursiveMode::Recursive);
                    log::info!("Watching: {}", path);
                }
            }
        }
    }

    // ── Main loop ──────────────────────────────────────────────────
    loop {
        // ── Sleep/Wake detection (Time-gap heuristic) ─────────────
        let loop_elapsed = last_loop_tick.elapsed();
        if loop_elapsed > Duration::from_secs(12) {
            log::info!(
                "System suspend/resume detected! Time gap: {:?}",
                loop_elapsed
            );

            // Instantly trigger sleep animation & sound/snore text
            let _ = app.emit("pet_animate", "sleep");
            let _ = app.emit("pet_message", "Zzz... Khò khò... 😴");

            // Wake up after 3.5 seconds
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(Duration::from_millis(3500)).await;
                let _ = app_clone.emit("pet_animate", "wake_up");
                let _ = app_clone.emit(
                    "pet_message",
                    "Oáp... Chủ nhân mới mở máy lại hả? Tiếp tục gõ code thôi! ☀️🐢",
                );
            });
        }
        last_loop_tick = Instant::now();

        // ── Process detection every 5s ────────────────────────────
        if last_process_check.elapsed() > Duration::from_secs(5) {
            sys.refresh_processes(ProcessesToUpdate::All, true);

            let mut detected: HashSet<String> = HashSet::new();
            let mut build_running = false;
            let mut active_tool_name: Option<String> = None;

            for (_pid, proc) in sys.processes() {
                let name = proc.name().to_string_lossy().to_lowercase();
                for (key, display) in DEV_PROCESSES {
                    if name.contains(key) {
                        detected.insert(key.to_string());
                        if active_tool_name.is_none() {
                            active_tool_name = Some(display.to_string());
                        }
                        let cmd: Vec<String> = proc
                            .cmd()
                            .iter()
                            .map(|s| s.to_string_lossy().to_lowercase())
                            .collect();
                        if cmd
                            .iter()
                            .any(|c| c.contains("run") || c.contains("build") || c.contains("test"))
                        {
                            build_running = true;
                        }
                    }
                }
            }

            // Update monitor state
            if let Ok(mut monitor) = monitor_arc.lock() {
                monitor.active_processes = detected;
                monitor.last_event_time = Some(Instant::now());
            }

            // Update pet active_tool; trigger build-start if needed
            let prev_tool = {
                if let Ok(pet) = pet_arc.lock() {
                    pet.active_tool.clone()
                } else {
                    None
                }
            };

            if let Ok(mut pet) = pet_arc.lock() {
                pet.active_tool = active_tool_name.clone();
            }

            if active_tool_name.is_some() && prev_tool.is_none() {
                coding_start = Some(Instant::now());
                if let Some(tool) = &active_tool_name {
                    if let Ok(db) = db_arc.lock() {
                        if let Ok(session_id) = db.start_session(tool) {
                            current_session_id = Some(session_id);
                            let _ = db.log_session_event(session_id, "session_start", Some(tool));
                        }
                    }
                }
                if build_running {
                    if let Some(tool) = &active_tool_name {
                        let reactions = {
                            if let Ok(mut pet) = pet_arc.lock() {
                                pet.handle_event(PetEvent::BuildStarted { tool: tool.clone() })
                            } else {
                                vec![]
                            }
                        };
                        emit_reactions(&app, reactions);
                    }
                }
            }

            last_process_check = Instant::now();
        }

        // ── File system events ────────────────────────────────────
        while let Ok(Ok(event)) = rx.try_recv() {
            handle_fs_event(&app, &event, &pet_arc, &db_arc, current_session_id);
        }

        // ── Idle detection every 60s ──────────────────────────────
        if last_idle_check.elapsed() > Duration::from_secs(60) {
            let is_active = monitor_arc
                .lock()
                .map(|m| {
                    m.last_event_time
                        .map(|t| t.elapsed() < Duration::from_secs(300))
                        .unwrap_or(false)
                })
                .unwrap_or(false);

            if is_active {
                if idle_minutes > 0 {
                    let reactions = {
                        if let Ok(mut pet) = pet_arc.lock() {
                            pet.handle_event(PetEvent::UserActive)
                        } else {
                            vec![]
                        }
                    };
                    emit_reactions(&app, reactions);
                    idle_minutes = 0;
                }

                // Alert after 2h, 4h, 6h... of coding
                if let Some(start) = coding_start {
                    let hours = start.elapsed().as_secs() / 3600;
                    if hours > 0 && hours % 2 == 0 {
                        let reactions = {
                            if let Ok(mut pet) = pet_arc.lock() {
                                pet.handle_event(PetEvent::CodingTooLong {
                                    hours: hours as u32,
                                })
                            } else {
                                vec![]
                            }
                        };
                        emit_reactions(&app, reactions);
                    }
                }
            } else {
                idle_minutes += 1;
                let reactions = {
                    if let Ok(mut pet) = pet_arc.lock() {
                        pet.handle_event(PetEvent::IdleDetected {
                            minutes: idle_minutes,
                        })
                    } else {
                        vec![]
                    }
                };
                emit_reactions(&app, reactions);

                if idle_minutes >= 30 {
                    coding_start = None;
                    if let Some(session_id) = current_session_id.take() {
                        if let Ok(db) = db_arc.lock() {
                            let _ = db.log_session_event(session_id, "session_end", None);
                            let _ = db.end_session(session_id);
                        }
                    }
                }
            }

            // Late-night coding check
            let hour = chrono::Local::now().hour();
            if hour < 5 {
                let reactions = {
                    if let Ok(mut pet) = pet_arc.lock() {
                        pet.handle_event(PetEvent::LateNightCoding)
                    } else {
                        vec![]
                    }
                };
                emit_reactions(&app, reactions);
            }

            last_idle_check = Instant::now();
        }

        // ── Auto-save every 30s ───────────────────────────────────
        if last_save.elapsed() > Duration::from_secs(30) {
            if let (Ok(pet), Ok(db)) = (pet_arc.lock(), db_arc.lock()) {
                let _ = db.save_pet(&pet);
                let _ = app.emit("pet_stats_update", &*pet);
            }
            last_save = Instant::now();
        }

        tokio::time::sleep(Duration::from_millis(1000)).await;
    }
}

fn handle_fs_event(
    app: &AppHandle,
    event: &Event,
    pet_arc: &Arc<Mutex<crate::pet_state::PetState>>,
    db_arc: &Arc<Mutex<crate::db::Database>>,
    session_id: Option<i64>,
) {
    for path in &event.paths {
        let path_str = path.to_string_lossy().to_lowercase();

        // Git commit
        if path_str.ends_with("commit_editmsg") {
            let commit_msg = std::fs::read_to_string(path)
                .unwrap_or_default()
                .to_lowercase();
            let is_bug_fix = commit_msg.contains("fix")
                || commit_msg.contains("bug")
                || commit_msg.contains("patch")
                || commit_msg.contains("hotfix");

            let reactions = {
                if let Ok(mut pet) = pet_arc.lock() {
                    pet.handle_event(PetEvent::GitCommit { is_bug_fix })
                } else {
                    vec![]
                }
            };
            emit_reactions(app, reactions);

            if let Ok(db) = db_arc.lock() {
                if let Some(sid) = session_id {
                    let _ = db.log_session_event(sid, "git_commit", Some(&commit_msg));
                } else {
                    let _ = db.log_event("git_commit", Some(&commit_msg));
                }
            }
        }

        // Build output artifact produced
        if (path_str.contains("build") || path_str.contains("debug"))
            && (path_str.ends_with(".apk")
                || path_str.ends_with(".exe")
                || path_str.ends_with(".msi"))
        {
            let reactions = {
                if let Ok(mut pet) = pet_arc.lock() {
                    pet.handle_event(PetEvent::BuildSuccess)
                } else {
                    vec![]
                }
            };
            emit_reactions(app, reactions);

            if let Ok(db) = db_arc.lock() {
                if let Some(sid) = session_id {
                    let _ = db.log_session_event(sid, "build_success", None);
                } else {
                    let _ = db.log_event("build_success", None);
                }
            }
        }

        // Null-safety errors in log files
        if path_str.ends_with(".log") {
            if let Ok(content) = std::fs::read_to_string(path) {
                if content.contains("Null check operator used on a null value")
                    || content.contains("NullPointerException")
                {
                    let reactions = {
                        if let Ok(mut pet) = pet_arc.lock() {
                            pet.handle_event(PetEvent::NullError)
                        } else {
                            vec![]
                        }
                    };
                    emit_reactions(app, reactions);

                    if let Ok(db) = db_arc.lock() {
                        if let Some(sid) = session_id {
                            let _ = db.log_session_event(
                                sid,
                                "null_safety_error",
                                Some("Null check operator used on a null value"),
                            );
                        } else {
                            let _ = db.log_event(
                                "null_safety_error",
                                Some("Null check operator used on a null value"),
                            );
                        }
                    }
                }
            }
        }
    }
}

fn emit_reactions(app: &AppHandle, reactions: Vec<PetReaction>) {
    for reaction in reactions {
        match &reaction {
            PetReaction::Message(msg) => {
                let _ = app.emit("pet_message", msg);
            }
            PetReaction::Animate(anim) => {
                let _ = app.emit("pet_animate", anim);
            }
            PetReaction::EasterEgg(egg) => {
                let _ = app.emit("pet_easter_egg", egg);
            }
            PetReaction::GainExp(xp) => {
                let _ = app.emit("pet_gain_exp", xp);
            }
            _ => {}
        }
    }
}
