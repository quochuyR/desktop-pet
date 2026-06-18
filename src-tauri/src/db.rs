use crate::pet_state::PetState;
use rusqlite::{params, Connection, Result};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("desktop-pet");

        std::fs::create_dir_all(&data_dir).ok();
        let db_path = data_dir.join("pet.db");

        let conn = Connection::open(db_path)?;

        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS pet_state (
                id INTEGER PRIMARY KEY,
                hp REAL NOT NULL DEFAULT 100,
                energy REAL NOT NULL DEFAULT 100,
                iq REAL NOT NULL DEFAULT 10,
                exp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                total_commits INTEGER NOT NULL DEFAULT 0,
                total_bug_fixes INTEGER NOT NULL DEFAULT 0,
                total_build_success INTEGER NOT NULL DEFAULT 0,
                total_build_fail INTEGER NOT NULL DEFAULT 0,
                consecutive_build_fails INTEGER NOT NULL DEFAULT 0,
                coding_streak_days INTEGER NOT NULL DEFAULT 0,
                last_coding_date TEXT,
                mood TEXT NOT NULL DEFAULT 'idle',
                career TEXT NOT NULL DEFAULT 'junior',
                idle_minutes INTEGER NOT NULL DEFAULT 0,
                active_tool TEXT,
                coding_minutes_today INTEGER NOT NULL DEFAULT 0,
                fail_streak INTEGER NOT NULL DEFAULT 0,
                null_errors INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS event_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                event_type TEXT NOT NULL,
                details TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS watched_paths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                label TEXT,
                active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                end_time TEXT,
                primary_activity TEXT
            );

            CREATE TABLE IF NOT EXISTS agent_kv (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS personality (
                id INTEGER PRIMARY KEY,
                friendly REAL NOT NULL DEFAULT 50.0,
                helpful REAL NOT NULL DEFAULT 50.0,
                funny REAL NOT NULL DEFAULT 50.0,
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS app_usage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                process_name TEXT NOT NULL,
                window_title TEXT,
                start_time TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
            );

            INSERT OR IGNORE INTO personality (id, friendly, helpful, funny) VALUES (1, 50.0, 50.0, 50.0);
        ")?;

        // Alter event_log table to add session_id column if it doesn't exist (compatibility with older DBs)
        let _ = conn.execute("ALTER TABLE event_log ADD COLUMN session_id INTEGER", []);

        Ok(Database { conn })
    }

    pub fn load_pet(&self) -> Result<PetState> {
        let result = self.conn.query_row(
            "SELECT hp, energy, iq, exp, level, total_commits, total_bug_fixes,
                    total_build_success, total_build_fail, consecutive_build_fails,
                    coding_streak_days, last_coding_date, mood, career,
                    idle_minutes, active_tool, coding_minutes_today, fail_streak, null_errors
             FROM pet_state WHERE id = 1",
            [],
            |row| {
                Ok(PetState {
                    hp: row.get(0)?,
                    energy: row.get(1)?,
                    iq: row.get(2)?,
                    exp: row.get(3)?,
                    level: row.get(4)?,
                    total_commits: row.get(5)?,
                    total_bug_fixes: row.get(6)?,
                    total_build_success: row.get(7)?,
                    total_build_fail: row.get(8)?,
                    consecutive_build_fails: row.get(9)?,
                    coding_streak_days: row.get(10)?,
                    last_coding_date: row.get(11)?,
                    mood: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(12)?))
                        .unwrap_or(crate::pet_state::PetMood::Idle),
                    career: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(13)?))
                        .unwrap_or(crate::pet_state::CareerLevel::JuniorTurtle),
                    idle_minutes: row.get(14)?,
                    active_tool: row.get(15)?,
                    session_start: None,
                    coding_minutes_today: row.get(16)?,
                    last_save: None,
                    fail_streak: row.get(17)?,
                    null_errors: row.get(18)?,
                })
            },
        );

        match result {
            Ok(pet) => Ok(pet),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // First run - insert default
                let default = PetState::default();
                self.save_pet(&default)?;
                Ok(default)
            }
            Err(e) => Err(e),
        }
    }

    pub fn save_pet(&self, pet: &PetState) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO pet_state (
                id, hp, energy, iq, exp, level, total_commits, total_bug_fixes,
                total_build_success, total_build_fail, consecutive_build_fails,
                coding_streak_days, last_coding_date, mood, career,
                idle_minutes, active_tool, coding_minutes_today, fail_streak, null_errors,
                updated_at
            ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                      ?15, ?16, ?17, ?18, ?19, datetime('now'))",
            params![
                pet.hp,
                pet.energy,
                pet.iq,
                pet.exp,
                pet.level,
                pet.total_commits,
                pet.total_bug_fixes,
                pet.total_build_success,
                pet.total_build_fail,
                pet.consecutive_build_fails,
                pet.coding_streak_days,
                pet.last_coding_date,
                pet.mood.as_str(),
                pet.career.as_str(),
                pet.idle_minutes,
                pet.active_tool,
                pet.coding_minutes_today,
                pet.fail_streak,
                pet.null_errors,
            ],
        )?;
        Ok(())
    }

    pub fn log_event(&self, event_type: &str, details: Option<&str>) -> Result<()> {
        self.conn.execute(
            "INSERT INTO event_log (event_type, details) VALUES (?1, ?2)",
            params![event_type, details],
        )?;
        Ok(())
    }

    pub fn log_session_event(
        &self,
        session_id: i64,
        event_type: &str,
        details: Option<&str>,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO event_log (session_id, event_type, details) VALUES (?1, ?2, ?3)",
            params![session_id, event_type, details],
        )?;
        Ok(())
    }

    pub fn start_session(&self, activity: &str) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO sessions (primary_activity) VALUES (?1)",
            params![activity],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn end_session(&self, session_id: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE sessions SET end_time = datetime('now', 'localtime') WHERE id = ?1",
            params![session_id],
        )?;
        Ok(())
    }

    pub fn get_personality(&self) -> Result<(f32, f32, f32)> {
        let result = self.conn.query_row(
            "SELECT friendly, helpful, funny FROM personality WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        );
        match result {
            Ok(p) => Ok(p),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                self.conn.execute(
                    "INSERT OR IGNORE INTO personality (id, friendly, helpful, funny) VALUES (1, 50.0, 50.0, 50.0)",
                    []
                )?;
                Ok((50.0, 50.0, 50.0))
            }
            Err(e) => Err(e),
        }
    }

    pub fn save_personality(&self, friendly: f32, helpful: f32, funny: f32) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO personality (id, friendly, helpful, funny, updated_at)
             VALUES (1, ?1, ?2, ?3, datetime('now', 'localtime'))",
            params![friendly, helpful, funny],
        )?;
        Ok(())
    }

    pub fn get_kv(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM agent_kv WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            let val: String = row.get(0)?;
            Ok(Some(val))
        } else {
            Ok(None)
        }
    }

    pub fn set_kv(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO agent_kv (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_watched_paths(&self) -> Result<Vec<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT path FROM watched_paths WHERE active = 1")?;
        let paths = stmt
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>>>()?;
        Ok(paths)
    }

    pub fn add_watched_path(&self, path: &str, label: Option<&str>) -> Result<()> {
        self.conn.execute(
            "INSERT OR IGNORE INTO watched_paths (path, label) VALUES (?1, ?2)",
            params![path, label],
        )?;
        Ok(())
    }

    pub fn log_app_usage(
        &self,
        process_name: &str,
        window_title: &str,
        start_time: &str,
        duration_seconds: u64,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO app_usage_log (process_name, window_title, start_time, duration_seconds) VALUES (?1, ?2, ?3, ?4)",
            params![process_name, window_title, start_time, duration_seconds],
        )?;
        Ok(())
    }

    pub fn get_app_usage(&self, limit: u32) -> Result<Vec<AppUsageEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT process_name, window_title, start_time, duration_seconds 
             FROM app_usage_log 
             ORDER BY created_at DESC 
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(AppUsageEntry {
                process_name: row.get(0)?,
                window_title: row.get(1)?,
                start_time: row.get(2)?,
                duration_seconds: row.get(3)?,
            })
        })?;

        let mut entries = Vec::new();
        for r in rows {
            entries.push(r?);
        }
        Ok(entries)
    }

    pub fn get_app_usage_summary(&self, days: u32) -> Result<Vec<AppUsageSummary>> {
        let time_modifier = format!("-{} days", days);
        let mut stmt = self.conn.prepare(
            "SELECT process_name, SUM(duration_seconds) as total_duration, COUNT(*) as sessions 
             FROM app_usage_log 
             WHERE created_at >= datetime('now', 'localtime', ?1)
             GROUP BY process_name 
             ORDER BY total_duration DESC",
        )?;
        let rows = stmt.query_map(params![time_modifier], |row| {
            Ok(AppUsageSummary {
                process_name: row.get(0)?,
                total_duration_seconds: row.get(1)?,
                session_count: row.get(2)?,
            })
        })?;

        let mut entries = Vec::new();
        for r in rows {
            entries.push(r?);
        }
        Ok(entries)
    }
}

#[derive(Debug, serde::Serialize)]
pub struct AppUsageEntry {
    pub process_name: String,
    pub window_title: String,
    pub start_time: String,
    pub duration_seconds: u32,
}

#[derive(Debug, serde::Serialize)]
pub struct AppUsageSummary {
    pub process_name: String,
    pub total_duration_seconds: u32,
    pub session_count: u32,
}
