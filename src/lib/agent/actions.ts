import { petState, state } from '../state.svelte';
import { particleSystem } from '../physics';

export interface AgentAction {
  name: string;
  preconditions: Record<string, any>;
  effects: Record<string, any>;
  /** Dynamic cost — evaluated at planning time so costs respond to current pet state */
  getCost(): number;
  execute(): void;
}

export const ACTIONS: AgentAction[] = [
  {
    name: 'ActionWander',
    preconditions: {},
    effects: { 'currentAction:wander': true },
    getCost() { return 2; },
    execute() {
      petState.currentAction = 'wander';
      petState.mood = 'walking';
      petState.vx = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.5);
      petState.actionTimer = 0;
      
      const wanderSpeeches = ['Đi tuần tra màn hình thôi! 👮🐢', 'Xem có bug nào quanh đây không... 🤔', 'Nao nao đi dạo nào! 🚶‍♂️'];
      state.speechText = wanderSpeeches[Math.floor(Math.random() * wanderSpeeches.length)];
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 2500);
    }
  },
  {
    name: 'ActionIdle',
    preconditions: {},
    effects: { 'currentAction:idle': true },
    getCost() { return 1; },
    execute() {
      petState.currentAction = 'idle';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.actionTimer = 0;
    }
  },
  {
    name: 'ActionSleep',
    preconditions: { 'currentAction:idle': true },
    effects: { 'petEnergyHigh': true, 'currentAction:sleep': true },
    getCost() { return 5; },
    execute() {
      petState.currentAction = 'sleep';
      petState.mood = 'sleeping';
      petState.vx = 0;
      petState.vy = 0;
      petState.actionTimer = 0;
      
      state.speechText = 'Zzz... Khò khò... 😴';
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
    }
  },
  {
    name: 'ActionDance',
    preconditions: { 'currentAction:idle': true },
    effects: { 'userCheered': true },
    getCost() { return 3; },
    execute() {
      petState.currentAction = 'idle';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.actionTimer = 0;
      
      const danceSpeeches = [
        'Bug ít quá, nhảy múa thôi! 💃🕺',
        'Có tôi ở đây rồi, đừng lo nhé! 🤗✨',
        'Cố lên bạn ơi, gõ code bốc lửa nào! 🔥🐢'
      ];
      state.speechText = danceSpeeches[Math.floor(Math.random() * danceSpeeches.length)];
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 4000);

      // Trigger side-by-side fireworks for preview
      for (let offset = -40; offset <= 40; offset += 40) {
        setTimeout(() => {
          particleSystem.addFireworks(petState.x + offset, petState.y - 30);
        }, Math.abs(offset) * 5);
      }
    }
  },
  {
    name: 'ActionPlayRequest',
    preconditions: { 'currentAction:wander': true },
    effects: { 'userInteracted': true },
    getCost() { return 2; },
    execute() {
      petState.currentAction = 'wander';
      petState.mood = 'excited';
      petState.vx = (Math.random() > 0.5 ? 1.5 : -1.5);
      petState.actionTimer = 0;
      
      state.speechText = 'Chán quá hà! Click chọc tôi đi bạn ơi! 🥺👉🐢';
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 3500);
    }
  },
  {
    name: 'ActionPortal',
    preconditions: { 'currentAction:idle': true },
    effects: { 'currentAction:portal': true },
    getCost() { return 4; },
    execute() {
      petState.currentAction = 'portal';
      petState.actionTimer = 0;
      petState.vx = 0;
      petState.vy = 0;
      
      state.speechText = 'Mở cổng dịch chuyển không gian! 🌀🌌';
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 2000);
    }
  },
  {
    name: 'ActionHourlyBreak',
    preconditions: { 'currentAction:portal': true },
    effects: { 'userTookBreak': true },
    getCost() { return 2; },
    execute() {
      // Trigger break mode
      petState.currentAction = 'hourly_break';
      petState.actionTimer = 0;
      petState.breakOrigX = petState.globalX;
      petState.breakOrigY = petState.globalY;
      petState.breakStartX = petState.globalX;
      petState.breakStartY = petState.globalY;
      state.breakTimer = 30.0;
      state.breakVisible = true;
    }
  },
  {
    name: 'ActionExploreScreen',
    preconditions: { 'currentAction:wander': true },
    effects: { 'screenExplored': true },
    getCost() { return 4; },
    execute() {
      // Climb ground right/left to start wall climbing!
      const isLeft = Math.random() > 0.5;
      petState.currentAction = isLeft ? 'climbing_ground_left' : 'climbing_ground_right';
      petState.vx = isLeft ? -1.5 : 1.5;
      petState.facingLeft = isLeft;
      (petState as any).climbCycles = 0;
      petState.actionTimer = 0;

      // Select random climb outcome
      // 60% success: leo đủ một vòng màn hình
      // 40% các kiểu té: fall_early, fall_halfway, stuck, fall_late
      const rand = Math.random();
      if (rand < 0.60) {
        (petState as any).climbOutcome = 'success';
      } else if (rand < 0.72) {
        (petState as any).climbOutcome = 'fall_early';   // 12%: té sớm ở tường đầu tiên
      } else if (rand < 0.82) {
        (petState as any).climbOutcome = 'fall_halfway'; // 10%: rớt giữa trần nhà
      } else if (rand < 0.91) {
        (petState as any).climbOutcome = 'stuck';        //  9%: kẹt trần rồi rớt
      } else {
        (petState as any).climbOutcome = 'fall_late';    //  9%: té khi đang xuống tường 2
      }
      
      // Determine how far along the wall/ceiling the fall happens (between 25% and 60%)
      (petState as any).climbFallThreshold = 0.25 + Math.random() * 0.35;
      
      state.speechText = 'Bám biên leo trần nhà thám hiểm thôi! 🧗‍♂️🕸️';
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 3000);
    }
  },
  {
    name: 'ActionStretchRemind',
    preconditions: {},
    effects: { 'userStretched': true },
    getCost() { return 1; },
    execute() {
      petState.currentAction = 'idle';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.actionTimer = 0;

      const advices = [
        'Bạn ngồi hơi lâu rồi đó, đứng dậy đi lại vài vòng cho đỡ mỏi nhé! 🚶‍♂️🐢',
        'Xoay cổ nhẹ nhàng sang trái rồi sang phải để thư giãn cơ cổ nào! 🧘‍♂️🐢',
        'Đến lúc uống một ngụm nước rồi bạn ơi! 💧🐢',
        'Nhắm mắt nghỉ ngơi 10 giây và xoay nhẹ khớp vai đi nào! 👀🐢',
        'Đứng dậy vươn vai một cái thật cao nào! 🤸‍♂️🐢',
        'Hãy hít thở thật sâu 3 nhịp để phổi được thư giãn nhé! 🌬️🐢'
      ];
      state.speechText = advices[Math.floor(Math.random() * advices.length)];
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 6000);
    }
  },
  {
    name: 'ActionCelebrateFireworks',
    preconditions: {},
    effects: { celebrationFinished: true },
    getCost() { return 1; },
    execute() {
      petState.currentAction = 'celebrate_fireworks';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.vy = 0;
      petState.actionTimer = 0;

      const dateObj = new Date();
      const hour = dateObj.getHours();
      let speech = '';

      if (hour === 12 || (hour < 15)) {
        speech = 'Đến giờ ăn trưa kèm nghỉ ngơi rồi, cất lap đi nạp tí năng lượng cho buổi chiều bùng nổ nào chủ nhân ơi! 🍱🐢🎆';
      } else {
        speech = 'Đến giờ về nhà thôi, tắt máy dọn dẹp bàn làm việc rồi chuẩn bị về nghỉ ngơi thư giãn thôi chủ nhân ơi! 🌅🐢🎆';
      }

      state.speechText = speech;
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      // Long timeout for celebration
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 20000);
    }
  },
  {
    name: 'ActionEatSnack',
    preconditions: {},
    effects: { petSelfCared: true },
    getCost() {
      // Ưu tiên khi energy thấp (effect chính: +12 energy)
      // Cũng giúp khi hp trung bình (effect phụ: +6 hp)
      // Cost dao động 0.5 (rất cần) đến 4.0 (không cần lắm)
      const energyNeed = Math.max(0, 70 - petState.energy) / 70; // 0..1, cao khi energy < 70
      const hpBonus   = Math.max(0, 50 - petState.hp) / 50 * 0.4; // nhỏ hơn, chỉ hỗ trợ
      return Math.max(0.5, 4.0 - (energyNeed + hpBonus) * 3.5);
    },
    execute() {
      petState.currentAction = 'eat_snack';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.vy = 0;
      petState.actionTimer = 0;

      const snackSpeeches = [
        'Măm măm... Bánh quy chocolate giòn rụm ngon quá! 🍪🐢',
        'Ngoạm... Quả dâu tây chín đỏ mọng ngọt lịm! 🍓🐢',
        'Ăn tí snack giòn rụm nạp năng lượng chiến đấu với bug! 🍿🐢'
      ];
      state.speechText = snackSpeeches[Math.floor(Math.random() * snackSpeeches.length)];
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 4000);
    }
  },
  {
    name: 'ActionDrinkWater',
    preconditions: {},
    effects: { petSelfCared: true },
    getCost() {
      // Ưu tiên cao nhất khi hp thấp (effect chính: +15 hp)
      // Có thể hỗ trợ thêm chút energy (effect phụ: +5)
      const hpNeed     = Math.max(0, 60 - petState.hp) / 60;     // 0..1, cao khi hp < 60
      const energyHint = Math.max(0, 40 - petState.energy) / 40 * 0.3; // chỉ kick in khi energy rất thấp
      return Math.max(0.5, 4.0 - (hpNeed + energyHint) * 3.5);
    },
    execute() {
      petState.currentAction = 'drink_water';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.vy = 0;
      petState.actionTimer = 0;

      const waterSpeeches = [
        'Làm ngụm nước mát tinh khiết thanh lọc cơ thể nào! 💧🐢',
        'Ức ức... Trà sữa boba 50% đường trân châu dai giòn! 🧋🐢',
        'Uống đủ nước mỗi ngày để minh mẫn fix bug nhé bạn ơi! 🥤🐢'
      ];
      state.speechText = waterSpeeches[Math.floor(Math.random() * waterSpeeches.length)];
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 4000);
    }
  },
  {
    name: 'ActionPutOnHat',
    preconditions: {},
    effects: { petSelfCared: true },
    getCost() {
      // Hoạt động giải trí/thẩm mỹ — ưu tiên thấp nhất
      // Chỉ được chọn khi energy, hp, iq đều ổn (là phần thưởng khi khỏe mạnh)
      const isHealthy = petState.energy > 70 && petState.hp > 70 && petState.iq > 50;
      return isHealthy ? 1.0 : 4.5; // rẻ khi khỏe, đắt khi cần phục hồi
    },
    execute() {
      petState.currentAction = 'put_on_hat';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.vy = 0;
      petState.actionTimer = 0;

      const hatSpeeches = [
        'Để xem... đội nón gì cho ngầu hôm nay ta? 🎩🐢',
        'Biến hình! Thay đổi phong cách thời trang nào! 👒✨',
        'Nâng cấp diện mạo mới cho Rùa Dev! 🧢🐢'
      ];
      state.speechText = hatSpeeches[Math.floor(Math.random() * hatSpeeches.length)];
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 3000);
    }
  },
  {
    name: 'ActionReadBook',
    preconditions: {},
    effects: { petSelfCared: true },
    getCost() {
      // Ưu tiên khi iq hoặc exp thấp (effect: +2.5 iq, +6 exp)
      // iq ban đầu = 10, tăng chậm → cần thường xuyên
      const iqNeed  = Math.max(0, 60 - petState.iq) / 60;   // 0..1
      const expNeed = Math.max(0, 60 - petState.exp) / 60 * 0.5; // hỗ trợ
      return Math.max(0.5, 4.0 - (iqNeed + expNeed) * 3.5);
    },
    execute() {
      petState.currentAction = 'read_book';
      petState.mood = 'happy';
      petState.vx = 0;
      petState.vy = 0;
      petState.actionTimer = 0;

      const bookSpeeches = [
        'Đang nghiên cứu bí kíp Clean Code tối thượng! 📖👓',
        'Học cấu trúc dữ liệu và giải thuật tối ưu hệ thống! 📚🐢',
        'Đọc sách tăng trình độ code, chuẩn bị lên Senior thôi! 🧠📖'
      ];
      state.speechText = bookSpeeches[Math.floor(Math.random() * bookSpeeches.length)];
      state.speechVisible = true;
      if (state.speechTimeout) clearTimeout(state.speechTimeout);
      state.speechTimeout = setTimeout(() => { state.speechVisible = false; }, 5000);
    }
  }
];
