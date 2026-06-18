use sysinfo::System;

/// System-level monitoring delegates to dev_monitor
pub async fn start_monitoring(app: tauri::AppHandle) {
    crate::dev_monitor::start_monitoring(app).await;
}

/// Check if system is idle based on CPU usage
pub fn is_system_idle(sys: &mut System) -> bool {
    let total_cpu: f32 = sys.processes().values().map(|p| p.cpu_usage()).sum();
    total_cpu < 5.0
}
