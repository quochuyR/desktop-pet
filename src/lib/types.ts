export const PetAction = {
  Idle: 'idle',
  Wander: 'wander',
  Sleep: 'sleep',
  Portal: 'portal',
  HourlyBreak: 'hourly_break',
  HourlyBreakExit: 'hourly_break_exit',
  Falling: 'falling',
  Dangling: 'dangling',
  Flipped: 'flipped',
  CryingGround: 'crying_ground',
  Tired: 'tired',
  CelebrateFireworks: 'celebrate_fireworks',
  StretchRemind: 'stretch_remind',
  StatsDialog: 'stats_dialog',
  StatsDialogExit: 'stats_dialog_exit',
  
  // Climbing actions
  PrepareClimbLeft: 'prepare_climb_left',
  ClimbingLeft: 'climbing_left',
  PrepareCeiling: 'prepare_ceiling',
  ClimbingCeiling: 'climbing_ceiling',
  ClimbingCeilingStuck: 'climbing_ceiling_stuck',
  PrepareRightDown: 'prepare_right_down',
  ClimbingRightDown: 'climbing_right_down',
  PrepareGroundLeft: 'prepare_ground_left',
  ClimbingGroundLeft: 'climbing_ground_left',

  PrepareClimbRight: 'prepare_climb_right',
  ClimbingRight: 'climbing_right',
  PrepareCeilingLeft: 'prepare_ceiling_left',
  ClimbingCeilingLeft: 'climbing_ceiling_left',
  PrepareLeftDown: 'prepare_left_down',
  ClimbingLeftDown: 'climbing_left_down',
  PrepareGroundRight: 'prepare_ground_right',
  ClimbingGroundRight: 'climbing_ground_right',
} as const;

export type PetActionType = typeof PetAction[keyof typeof PetAction];
