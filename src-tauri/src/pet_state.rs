use serde::{Deserialize, Serialize};

/// Career levels based on commit count and streak
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CareerLevel {
    JuniorTurtle,
    MidTurtle,
    SeniorTurtle,
    ArchitectTurtle,
    CtoTurtle,
}

impl CareerLevel {
    pub fn from_commits(commits: u32, streak_days: u32) -> Self {
        if commits >= 1000 && streak_days >= 365 {
            CareerLevel::CtoTurtle
        } else if commits >= 500 {
            CareerLevel::ArchitectTurtle
        } else if commits >= 200 {
            CareerLevel::SeniorTurtle
        } else if commits >= 50 {
            CareerLevel::MidTurtle
        } else {
            CareerLevel::JuniorTurtle
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            CareerLevel::JuniorTurtle => "Junior Turtle 🐣",
            CareerLevel::MidTurtle => "Mid Turtle 🐢",
            CareerLevel::SeniorTurtle => "Senior Turtle 🎓",
            CareerLevel::ArchitectTurtle => "Architect Turtle 🏗️",
            CareerLevel::CtoTurtle => "CTO Turtle 👑",
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            CareerLevel::JuniorTurtle => "junior",
            CareerLevel::MidTurtle => "mid",
            CareerLevel::SeniorTurtle => "senior",
            CareerLevel::ArchitectTurtle => "architect",
            CareerLevel::CtoTurtle => "cto",
        }
    }
}

/// Pet animation state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PetMood {
    Happy,
    Idle,
    Walking,
    Sleeping,
    Excited,
    Sad,
    Working,
    Celebrating,
    Running, // Running away (build fail 10x)
    Helmet,  // Wearing helmet (build in progress)
}

impl PetMood {
    pub fn as_str(&self) -> &str {
        match self {
            PetMood::Happy => "happy",
            PetMood::Idle => "idle",
            PetMood::Walking => "walking",
            PetMood::Sleeping => "sleeping",
            PetMood::Excited => "excited",
            PetMood::Sad => "sad",
            PetMood::Working => "working",
            PetMood::Celebrating => "celebrating",
            PetMood::Running => "running",
            PetMood::Helmet => "helmet",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetState {
    // Core stats
    pub hp: f32,
    pub energy: f32,
    pub iq: f32,
    pub exp: u32,
    pub level: u32,

    // Dev stats
    pub total_commits: u32,
    pub total_bug_fixes: u32,
    pub total_build_success: u32,
    pub total_build_fail: u32,
    pub consecutive_build_fails: u32,
    pub coding_streak_days: u32,
    pub last_coding_date: Option<String>,

    // Current state
    pub mood: PetMood,
    pub career: CareerLevel,
    pub idle_minutes: u32,
    pub active_tool: Option<String>,

    // Session tracking
    pub session_start: Option<String>,
    pub coding_minutes_today: u32,
    pub last_save: Option<String>,

    // Easter egg counters
    pub fail_streak: u32,
    pub null_errors: u32,
}

impl Default for PetState {
    fn default() -> Self {
        Self {
            hp: 100.0,
            energy: 100.0,
            iq: 10.0,
            exp: 0,
            level: 1,
            total_commits: 0,
            total_bug_fixes: 0,
            total_build_success: 0,
            total_build_fail: 0,
            consecutive_build_fails: 0,
            coding_streak_days: 0,
            last_coding_date: None,
            mood: PetMood::Idle,
            career: CareerLevel::JuniorTurtle,
            idle_minutes: 0,
            active_tool: None,
            session_start: None,
            coding_minutes_today: 0,
            last_save: None,
            fail_streak: 0,
            null_errors: 0,
        }
    }
}

impl PetState {
    /// Handle game events and update stats
    pub fn handle_event(&mut self, event: PetEvent) -> Vec<PetReaction> {
        let mut reactions = Vec::new();

        match event {
            PetEvent::GitCommit { is_bug_fix } => {
                self.total_commits += 1;
                self.consecutive_build_fails = 0;
                self.fail_streak = 0;

                if is_bug_fix {
                    self.total_bug_fixes += 1;
                    self.exp += 10;
                    self.iq = (self.iq + 0.5).min(100.0);
                    reactions.push(PetReaction::GainExp(10));
                    reactions.push(PetReaction::Message("Bug fixed! +10 EXP 🔧".into()));
                } else {
                    self.exp += 5;
                    reactions.push(PetReaction::GainExp(5));
                    reactions.push(PetReaction::Message("Commit! +5 EXP 📝".into()));
                }
                self.mood = PetMood::Happy;
                self.update_career();
                self.update_coding_streak();
            }

            PetEvent::BuildSuccess => {
                self.total_build_success += 1;
                self.consecutive_build_fails = 0;
                self.fail_streak = 0;
                self.hp = (self.hp + 5.0).min(100.0);
                self.exp += 3;
                self.mood = PetMood::Celebrating;
                reactions.push(PetReaction::Animate("celebrate".into()));
                reactions.push(PetReaction::Message("Build thành công! 🎉".into()));
            }

            PetEvent::BuildFail => {
                self.total_build_fail += 1;
                self.consecutive_build_fails += 1;
                self.fail_streak += 1;
                self.hp = (self.hp - 5.0).max(0.0);

                if self.consecutive_build_fails >= 10 {
                    self.mood = PetMood::Running;
                    reactions.push(PetReaction::EasterEgg("helmet_run".into()));
                    reactions.push(PetReaction::Message("Build fail lần 10 rồi... 🐢💨".into()));
                } else {
                    self.mood = PetMood::Sad;
                    reactions.push(PetReaction::Animate("cry".into()));
                    reactions.push(PetReaction::Message(format!(
                        "Build fail lần {}... 😭",
                        self.consecutive_build_fails
                    )));
                }
            }

            PetEvent::TestPass100 => {
                self.exp += 15;
                self.mood = PetMood::Celebrating;
                reactions.push(PetReaction::Animate("party".into()));
                reactions.push(PetReaction::Message("Test 100%! Mở tiệc thôi! 🎊".into()));
            }

            PetEvent::BuildStarted { tool } => {
                self.active_tool = Some(tool.clone());
                self.mood = PetMood::Helmet;
                reactions.push(PetReaction::Animate("helmet".into()));
                reactions.push(PetReaction::Message(format!("{} đang chạy... 👷", tool)));
            }

            PetEvent::IdleDetected { minutes } => {
                self.idle_minutes = minutes;
                self.energy = (self.energy - (minutes as f32 * 0.3)).max(0.0);

                if minutes >= 120 {
                    // 2 hours idle = "lướt Facebook"
                    reactions.push(PetReaction::Message(
                        "Lướt Facebook 2 tiếng rồi đó... -20 Energy 😒".into(),
                    ));
                } else if minutes >= 30 {
                    self.mood = PetMood::Sleeping;
                }
            }

            PetEvent::UserActive => {
                if self.idle_minutes >= 30 {
                    self.mood = PetMood::Happy;
                    reactions.push(PetReaction::Animate("wake_up".into()));
                }
                self.idle_minutes = 0;
            }

            PetEvent::NullError => {
                self.null_errors += 1;
                reactions.push(PetReaction::Message("Lại dấu ! nữa hả? 🐢".into()));
            }

            PetEvent::CodingTooLong { hours } => {
                reactions.push(PetReaction::Message(format!(
                    "Code {} tiếng liên tục rồi... Uống nước chưa? 💧",
                    hours
                )));
                self.energy = (self.energy - 10.0).max(0.0);
            }

            PetEvent::LateNightCoding => {
                reactions.push(PetReaction::Message(
                    "Commit lúc 3 giờ sáng... Về nhà ngủ đi! 🌙🐢".into(),
                ));
            }

            PetEvent::Clicked => {
                self.mood = match &self.mood {
                    PetMood::Sleeping => PetMood::Idle,
                    _ => PetMood::Happy,
                };
                reactions.push(PetReaction::Animate("react".into()));
            }
        }

        // Auto-decay every call
        self.apply_passive_decay();
        self.level = self.calculate_level();

        reactions
    }

    fn apply_passive_decay(&mut self) {
        // Energy slowly drains
        self.energy = (self.energy - 0.01).max(0.0);
    }

    fn calculate_level(&self) -> u32 {
        // Level = sqrt(exp / 10) + 1
        (((self.exp as f32 / 10.0).sqrt()) as u32) + 1
    }

    fn update_career(&mut self) {
        self.career = CareerLevel::from_commits(self.total_commits, self.coding_streak_days);
    }

    fn update_coding_streak(&mut self) {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        if let Some(last_date) = &self.last_coding_date {
            if last_date != &today {
                self.coding_streak_days += 1;
            }
        } else {
            self.coding_streak_days = 1;
        }
        self.last_coding_date = Some(today);
    }
}

/// Events that affect the pet
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PetEvent {
    GitCommit { is_bug_fix: bool },
    BuildSuccess,
    BuildFail,
    TestPass100,
    BuildStarted { tool: String },
    IdleDetected { minutes: u32 },
    UserActive,
    NullError,
    CodingTooLong { hours: u32 },
    LateNightCoding,
    Clicked,
}

/// Reactions sent to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PetReaction {
    GainExp(u32),
    LoseHp(f32),
    Animate(String),
    Message(String),
    EasterEgg(String),
    ShowStats,
}
