use crate::AppState;
use std::sync::mpsc;
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

#[cfg(target_os = "windows")]
#[allow(non_snake_case, dead_code)]
pub mod bindings {
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

#[cfg(target_os = "windows")]
pub use bindings::*;

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

    if bindings::IsWindowVisible(hwnd) == 0 || bindings::IsIconic(hwnd) != 0 {
        return 1;
    }

    let mut pid: u32 = 0;
    bindings::GetWindowThreadProcessId(hwnd, &mut pid);
    if pid == std::process::id() {
        return 1;
    }

    let mut class_buf = [0u16; 256];
    let len = bindings::GetClassNameW(hwnd, class_buf.as_mut_ptr(), 256);
    let class_name = if len > 0 {
        String::from_utf16_lossy(&class_buf[..len as usize])
    } else {
        String::new()
    };

    if class_name == "Progman" || class_name == "WorkerW" {
        return 1;
    }

    let mut text_buf = [0u16; 256];
    let text_len = bindings::GetWindowTextW(hwnd, text_buf.as_mut_ptr(), 256);
    let title = if text_len > 0 {
        String::from_utf16_lossy(&text_buf[..text_len as usize])
    } else {
        String::new()
    };

    let mut rect = bindings::RECT { left: 0, top: 0, right: 0, bottom: 0 };
    if bindings::GetWindowRect(hwnd, &mut rect) != 0 {
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
        bindings::EnumWindows(
            Some(enum_windows_callback),
            &mut platforms as *mut Vec<WindowPlatform> as isize,
        );
    }
    let _ = app_handle.emit("window_platforms_update", &platforms);
}

pub fn run_win_event_listener(app_handle: tauri::AppHandle) {
    #[cfg(target_os = "windows")]
    {
        let app_handle_clone = app_handle.clone();

        std::thread::spawn(move || {
            let (tx, rx) = mpsc::channel();
            if UPDATE_SENDER.set(tx).is_ok() {
                let mut last_run = Instant::now() - Duration::from_millis(500);
                update_platforms(&app_handle_clone);

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
                        while rx.try_recv().is_ok() {}

                        let now = Instant::now();
                        let elapsed = now.duration_since(last_run);
                        if elapsed < Duration::from_millis(33) {
                            std::thread::sleep(Duration::from_millis(33) - elapsed);
                        }

                        update_platforms(&app_handle_clone);

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

                                    let display_name =
                                        curr_proc.strip_suffix(".exe").unwrap_or(&curr_proc);
                                    let lowercase_name = curr_proc.to_lowercase();

                                    if !lowercase_name.contains("desktop-pet")
                                        && !lowercase_name.contains("desktop_pet")
                                    {
                                        let msg = if lowercase_name.contains("code") {
                                            "Chủ nhân mở VS Code gõ code kìa! Tập trung gõ code thôi! 💻🐢".to_string()
                                        } else if lowercase_name.contains("chrome") {
                                            "Đang lướt web tìm tài liệu trên Chrome đúng hông? 🌐🐢".to_string()
                                        } else if lowercase_name.contains("msedge") {
                                            "Lướt Edge tìm giải pháp fix bug hả chủ nhân? 🌐🐢".to_string()
                                        } else if lowercase_name.contains("cmd")
                                            || lowercase_name.contains("powershell")
                                            || lowercase_name.contains("terminal")
                                        {
                                            "Mở Terminal gõ lệnh gì ngầu vậy chủ nhân ơi? 💻🐢".to_string()
                                        } else if lowercase_name.contains("discord") {
                                            "Có cuộc gọi hay tin nhắn mới trên Discord kìa! 💬🐢".to_string()
                                        } else if lowercase_name.contains("slack") {
                                            "Slack có tin nhắn công việc kìa chủ nhân ơi! 💬🐢".to_string()
                                        } else if lowercase_name.contains("spotify") {
                                            "Nghe nhạc Spotify chill chill rồi code tiếp nha! 🎵🐢".to_string()
                                        } else {
                                            format!("Chủ nhân đang mở ứng dụng {} kìa! 🕵️‍♂️🐢", display_name)
                                        };
                                        let _ = app_handle_clone.emit("pet_message", msg);
                                    }
                                }

                                last_active_app = Some((curr_proc, curr_title));
                                active_app_since = Instant::now();
                                active_app_start_time =
                                    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                            }
                        } else {
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
            let hook_foreground = bindings::SetWinEventHook(
                0x0003, 0x0003, std::ptr::null_mut(), Some(win_event_proc), 0, 0, 0,
            );

            let hook_location = bindings::SetWinEventHook(
                0x800B, 0x800B, std::ptr::null_mut(), Some(win_event_proc), 0, 0, 0,
            );

            let hook_state = bindings::SetWinEventHook(
                0x0016, 0x0017, std::ptr::null_mut(), Some(win_event_proc), 0, 0, 0,
            );

            let hook_destroy = bindings::SetWinEventHook(
                0x8001, 0x8003, std::ptr::null_mut(), Some(win_event_proc), 0, 0, 0,
            );

            let mut msg = bindings::MSG {
                hwnd: std::ptr::null_mut(),
                message: 0,
                wParam: 0,
                lParam: 0,
                time: 0,
                pt: bindings::POINT { x: 0, y: 0 },
            };

            while bindings::GetMessageW(
                &mut msg as *mut bindings::MSG as *mut std::ffi::c_void,
                std::ptr::null_mut(),
                0,
                0,
            ) > 0
            {}

            if !hook_foreground.is_null() { bindings::UnhookWinEvent(hook_foreground); }
            if !hook_location.is_null() { bindings::UnhookWinEvent(hook_location); }
            if !hook_state.is_null() { bindings::UnhookWinEvent(hook_state); }
            if !hook_destroy.is_null() { bindings::UnhookWinEvent(hook_destroy); }
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn run_win_event_listener(_app_handle: tauri::AppHandle) {}
