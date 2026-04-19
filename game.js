const INGREDIENTS = [
  { id: "flour", icon: "🌾", name: "Flour" },
  { id: "butter", icon: "🧈", name: "Butter" },
  { id: "sugar", icon: "🍚", name: "Sugar" },
  { id: "eggs", icon: "🥚", name: "Eggs" },
  { id: "milk", icon: "🥛", name: "Milk" },
  { id: "choc", icon: "🍫", name: "Choc" },
  { id: "bpowder", icon: "🫙", name: "B.Powder" },
  { id: "vanilla", icon: "🌿", name: "Vanilla" },
  { id: "cinnamon", icon: "🫚", name: "Cinnamon" },
  { id: "strawb", icon: "🍓", name: "Strawb." },
  { id: "salt", icon: "🧂", name: "Salt" },
  { id: "yeast", icon: "🟤", name: "Yeast" },
];

const RECIPES = [
  {
    name: "Victoria Sponge 🎂",
    required: ["flour","butter","sugar","eggs","bpowder"],
    decoys: ["salt","cinnamon","yeast"],
  },
  {
    name: "Choc Lava Cake 🍫",
    required: ["choc","butter","eggs","sugar","flour"],
    decoys: ["milk","yeast","cinnamon"],
  },
  {
    name: "Cinnamon Rolls 🥐",
    required: ["flour","yeast","milk","butter","cinnamon","sugar"],
    decoys: ["bpowder","choc","salt"],
  },
  {
    name: "Strawberry Shortcake 🍓",
    required: ["flour","butter","sugar","strawb","milk"],
    decoys: ["yeast","choc","cinnamon"],
  },
  {
    name: "Banana Bread 🍌",
    required: ["flour","sugar","eggs","butter","bpowder","vanilla"],
    decoys: ["choc","yeast","salt"],
  },
];

let state = {
  score: 0,
  lives: 3,
  round: 1,
  streak: 0,
  coins: 0,
  shield: false,
  timerBoost: 0,
  scoreBoost: false,
  bowl: [],
  mixed: false,
  baked: false,
  recipe: null,
  timerPct: 100,
  timerInterval: null,
};

function showGame() {
  initAudio();
  startBGM();
  document.getElementById('screen-start').classList.remove('active');
  document.getElementById('screen-game').classList.add('active');
  buildIngredientShelf();
  showOrderFlash(() => newOrder());
}

function buildIngredientShelf() {
  const container = document.getElementById('ingredients');
  container.innerHTML = '';
  INGREDIENTS.forEach(ing => {
    const el = document.createElement('div');
    el.className = 'ing';
    el.id = 'ing-' + ing.id;
    el.innerHTML = `<span class="i-icon">${ing.icon}</span><span class="i-name">${ing.name}</span>`;
    el.addEventListener('click', () => clickIngredient(ing));
    container.appendChild(el);
  });
}

function resetShelfHighlights() {
  INGREDIENTS.forEach(ing => {
    const el = document.getElementById('ing-' + ing.id);
    if (!el) return;
    el.classList.remove('needed', 'added', 'wrong');
  });
}

function highlightNeeded() {
  if (!state.recipe) return;
  state.recipe.required.forEach(id => {
    if (!state.bowl.includes(id)) {
      document.getElementById('ing-' + id)?.classList.add('needed');
    }
  });
}

function newOrder() {
  state.bowl = [];
  state.mixed = false;
  state.baked = false;
  renderBowl();

  document.getElementById('oven-contents').textContent = '🕳️';

  let pick;
  do { pick = RECIPES[Math.floor(Math.random() * RECIPES.length)]; }
  while (RECIPES.length > 1 && pick === state.recipe);
  state.recipe = pick;

  const ids = shuffle([...state.recipe.required, ...state.recipe.decoys]);
  const container = document.getElementById('ingredients');
  container.innerHTML = '';
  ids.forEach(id => {
    const ing = INGREDIENTS.find(i => i.id === id);
    if (!ing) return;
    const el = document.createElement('div');
    el.className = 'ing';
    el.id = 'ing-' + ing.id;
    el.innerHTML = `<span class="i-icon">${ing.icon}</span><span class="i-name">${ing.name}</span>`;
    el.addEventListener('click', () => clickIngredient(ing));
    container.appendChild(el);
  });

  document.getElementById('ticket-title').textContent = state.recipe.name;
  const ul = document.getElementById('ticket-list');
  ul.innerHTML = state.recipe.required.map(id => {
    const ing = INGREDIENTS.find(i => i.id === id);
    return `<li id="tick-${id}">${ing?.icon} ${ing?.name}</li>`;
  }).join('');

  document.getElementById('hud-order').textContent = state.recipe.name;
  document.getElementById('hud-round').textContent = state.round;
  updateLivesHUD();
  updateStreakHUD();

  // timer shrinks every 3 rounds, min 20s
  const timerSecs = Math.max(20, 60 - Math.floor((state.round - 1) / 3) * 5);
  startTimer(timerSecs);
  scheduleChaos();
  timerTickToggle = false;
}

function updateTicket() {
  state.recipe.required.forEach(id => {
    const li = document.getElementById('tick-' + id);
    if (!li) return;
    li.classList.toggle('done', state.bowl.includes(id));
  });
}

function clickIngredient(ing) {
  if (state.baked) return;

  const el = document.getElementById('ing-' + ing.id);
  if (!el || el.classList.contains('added')) return;

  const isNeeded = state.recipe.required.includes(ing.id);
  const alreadyIn = state.bowl.includes(ing.id);

  if (!isNeeded || alreadyIn) {
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 500);
    document.getElementById('screen-game').classList.add('shaking');
    setTimeout(() => document.getElementById('screen-game').classList.remove('shaking'), 400);
    sfxWrong();
    loseLife();
    showFeedback(["Eww, really? 🤢", "Nope! ❌", "That's NOT it 😬", "Wrong ingredient! 🙃"][Math.floor(Math.random()*4)], '#FF6B9D');
    return;
  }

  flyToBowl(el, ing, () => {
    sfxPlop();
    state.bowl.push(ing.id);
    el.classList.add('added');
    renderBowl();
    updateTicket();
  });
}

function flyToBowl(el, ing, onDone) {
  const clone = document.getElementById('fly-clone');
  clone.textContent = ing.icon;
  clone.classList.remove('hidden');
  clone.classList.remove('flying');

  const src = el.getBoundingClientRect();
  clone.style.left = (src.left + src.width/2 - 12) + 'px';
  clone.style.top = (src.top + src.height/2 - 12) + 'px';
  clone.style.opacity = '1';
  clone.style.transform = 'scale(1)';

  const bowl = document.getElementById('bowl').getBoundingClientRect();
  const tx = bowl.left + bowl.width/2 - 12;
  const ty = bowl.top + bowl.height/2 - 12;

  // void forces a reflow so the transition actually plays
  void clone.offsetWidth;
  clone.classList.add('flying');
  clone.style.left = tx + 'px';
  clone.style.top = ty + 'px';
  clone.style.opacity = '0';
  clone.style.transform = 'scale(0.3) rotate(360deg)';

  setTimeout(() => {
    clone.classList.add('hidden');
    clone.classList.remove('flying');
    onDone();
  }, 460);
}

function renderBowl() {
  const el = document.getElementById('bowl-contents');
  if (state.bowl.length === 0) {
    el.textContent = '';
    return;
  }
  el.innerHTML = state.bowl.map(id => {
    const ing = INGREDIENTS.find(i => i.id === id);
    return `<span>${ing?.icon}</span>`;
  }).join('');
}

function mixBowl() {
  if (state.bowl.length === 0) {
    showFeedback("Bowl is empty! 😅", '#4D96FF');
    return;
  }
  sfxMix();
  state.mixed = true;
  const bowl = document.getElementById('bowl');
  bowl.style.transform = 'scale(1.15)';
  setTimeout(() => bowl.style.transform = '', 200);
  showFeedback("Mixed! 🥄", '#FFD93D');
}

function bakeIt() {
  if (!state.mixed) {
    showFeedback("Mix it first! 🥄", '#4D96FF');
    return;
  }
  if (state.baked) return;

  sfxBakeStart();
  state.baked = true;
  clearInterval(state.timerInterval);
  stopChaos();

  const needed = state.recipe.required;
  const correct = needed.filter(id => state.bowl.includes(id)).length;
  const pct = correct / needed.length;

  if (pct === 1) {
    state.streak++;
  } else {
    state.streak = 0;
  }
  updateStreakHUD();

  const multiplier = (1 + Math.floor(state.streak / 3) * 0.5) * (state.scoreBoost ? 2 : 1);
  state.scoreBoost = false;
  const earned = Math.round((Math.round(pct * 100) + Math.floor(state.timerPct * 0.3)) * multiplier);
  state.score += earned;
  document.getElementById('hud-score').textContent = state.score;

  const coinsEarned = pct === 1 ? 20 : pct >= 0.6 ? 12 : pct >= 0.3 ? 5 : 0;
  state.coins += coinsEarned + (state.streak >= 3 ? 5 : 0);
  updateCoinsHUD();

  document.getElementById('oven-contents').textContent = '🔥';
  setTimeout(() => {
    const resultEmoji = pct === 1 ? '🎂' : pct >= 0.6 ? '🍰' : pct >= 0.3 ? '🥴' : '💀';
    document.getElementById('oven-contents').textContent = resultEmoji;

    const msgs = pct === 1
      ? ["Perfect bake! 🏆", "FLAWLESS! ✨", "Top tier! 👑"]
      : pct >= 0.6
      ? ["Not bad! 👍", "Pretty decent!", "Could be worse 😅"]
      : pct >= 0.3
      ? ["Umm... 😬", "That's... interesting 🤔", "The judges are concerned 😰"]
      : ["What IS that?! 💀", "DISASTER! 🔥", "Call the fire dept 🚒"];

    if (pct === 1) sfxPerfect();
    else if (pct >= 0.6) sfxGood();
    else if (pct >= 0.3) sfxBad();
    else sfxDisaster();

    const streakBonus = state.streak >= 3 ? ` (x${(1 + Math.floor(state.streak/3)*0.5).toFixed(1)} streak!)` : '';
    showFeedback(msgs[Math.floor(Math.random() * msgs.length)] + streakBonus, pct >= 0.6 ? '#6BCB77' : '#FF6B35');

    showJudgeReactions(pct);
    setTimeout(() => {
      hideJudgePanel(() => {
        state.round++;
        if (state.round % 3 === 1) {
          showShop(() => showOrderFlash(() => newOrder()));
        } else {
          showOrderFlash(() => newOrder());
        }
      });
    }, 3200);
  }, 1200);
}

function startTimer(seconds) {
  clearInterval(state.timerInterval);
  state.timerPct = 100;
  updateTimerBar();

  let secs = seconds;
  if (state.timerBoost > 0) { secs += 10; state.timerBoost--; }

  const step = 100 / (secs * 2);
  state.timerInterval = setInterval(() => {
    state.timerPct = Math.max(0, state.timerPct - step);
    updateTimerBar();
    if (state.timerPct <= 0) {
      clearInterval(state.timerInterval);
      onTimeUp();
    }
  }, 500);
}

function updateTimerBar() {
  const fill = document.getElementById('timer-fill');
  fill.style.width = state.timerPct + '%';
  fill.style.background =
    state.timerPct > 50 ? 'linear-gradient(90deg,#6BCB77,#FFD93D)' :
    state.timerPct > 25 ? 'linear-gradient(90deg,#FFD93D,#FF6B35)' :
                          'linear-gradient(90deg,#FF6B35,#FF6B9D)';
  if (state.timerPct < 25 && !state.baked) {
    timerTickToggle = !timerTickToggle;
    if (timerTickToggle) sfxTimerTick();
  }
}

function onTimeUp() {
  sfxTimeUp();
  stopChaos();
  showFeedback("TIME'S UP! ⏱️", '#FF6B9D');
  state.streak = 0;
  updateStreakHUD();
  loseLife();
  if (state.lives > 0) {
    setTimeout(() => {
      state.round++;
      showOrderFlash(() => newOrder());
    }, 1500);
  }
}

function loseLife() {
  sfxLoseLife();
  state.lives = Math.max(0, state.lives - 1);
  updateLivesHUD();
  if (state.lives === 0) gameOver();
}

function updateLivesHUD() {
  const hearts = ['❤️','❤️','❤️'].map((h, i) => i < state.lives ? h : '🖤').join('');
  document.getElementById('hud-lives').textContent = hearts;
}

function gameOver() {
  sfxGameOver();
  stopBGM();
  clearInterval(state.timerInterval);
  stopChaos();
  document.getElementById('judge-panel').classList.remove('show');
  document.getElementById('judge-panel').classList.add('hidden');
  showFeedback(`GAME OVER! Score: ${state.score} 💀`, '#FF6B35');
  console.log('game over - score:', state.score, 'round:', state.round);
  setTimeout(() => {
    if (confirm(`Game Over!\nRound: ${state.round} | Score: ${state.score}\nPlay again?`)) {
      state.score = 0; state.lives = 3; state.round = 1; state.streak = 0;
      state.coins = 0; state.shield = false; state.timerBoost = 0; state.scoreBoost = false;
      document.getElementById('hud-score').textContent = '0';
      updateCoinsHUD();
      startBGM();
      showOrderFlash(() => newOrder());
    }
  }, 1200);
}

function updateStreakHUD() {
  const el = document.getElementById('hud-streak');
  if (state.streak === 0) {
    el.textContent = '—';
    el.style.color = '';
  } else {
    el.textContent = '🔥'.repeat(Math.min(state.streak, 5));
    el.style.color = '#FF6B35';
  }
}

function showOrderFlash(onDone) {
  const overlay = document.getElementById('order-overlay');
  const text = document.getElementById('order-overlay-text');
  const round = state.round;

  const quips = [
    "New order incoming! 📋",
    "Next bake — GO! 🚀",
    "Judges are watching... 👀",
    "Don't burn it! 🔥",
    "Here we go again! 😤",
  ];

  text.innerHTML = `<span class="flash-round">Round ${round}</span><span class="flash-quip">${quips[(round - 1) % quips.length]}</span>`;

  if (round > 1 && round % 3 === 1) {
    text.innerHTML += `<span class="flash-warn">⚡ Timer shortened!</span>`;
  }

  sfxRound();
  overlay.classList.remove('hidden');
  overlay.classList.add('show');

  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.classList.add('hidden');
      onDone();
    }, 400);
  }, 1400);
}

let feedbackTimeout;
function showFeedback(msg, color = '#FF6B35') {
  const el = document.getElementById('feedback-pop');
  el.textContent = msg;
  el.style.borderColor = color;
  el.style.color = color;
  el.classList.remove('hidden');
  el.classList.add('show');

  clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 200);
  }, 1200);
}

const JUDGES = [
  {
    name: "Chef Gordon",
    avatar: "👨‍🍳",
    color: "#FF6B35",
    lines: {
      perfect: ["FINALLY. A worthy bake. Don't get used to it.", "This is what I call COOKING. Write that down.", "Stunning. I almost feel emotion."],
      good: ["It's... edible. I suppose.", "Not terrible. That's a compliment from me.", "Could be worse. Could also be better."],
      bad: ["What IS this? A bake or a cry for help?", "My nan could do better. She's been dead 10 years.", "This is RAW. Emotionally. And possibly literally."],
      disaster: ["Get out. GET OUT OF MY KITCHEN.", "I've seen prison food with more dignity.", "This is an absolute DISGRACE. I'm done."],
    }
  },
  {
    name: "Dame Margaret",
    avatar: "👵",
    color: "#C77DFF",
    lines: {
      perfect: ["Oh how delightful! Almost as good as mine, dear.", "Wonderful! You may bake for me anytime.", "I'm genuinely impressed. Don't tell anyone I said that."],
      good: ["Not bad, though my cat has baked better. Bless.", "Quite decent! You're improving, slowly.", "A solid effort, dear. A very ordinary solid effort."],
      bad: ["Oh... oh dear. Well, you tried.", "I'm sure your mother would be proud. Bless your heart.", "Interesting choice of... everything."],
      disaster: ["Oh you poor thing. Have you tried a different hobby?", "I cannot eat this. My dentures won't allow it.", "Even with cream this could not be saved, dear."],
    }
  },
  {
    name: "Foodie Raj",
    avatar: "🧑‍🦱",
    color: "#4D96FF",
    lines: {
      perfect: ["I am CRYING actual tears. This is TRANSCENDENT.", "BRO. BRO. This hits different. 10/10.", "I need the recipe. I need it NOW."],
      good: ["Okay okay I SEE you! Solid work, not gonna lie.", "Lowkey amazing? Respect.", "Vibes immaculate. Taste solid. I fw it."],
      bad: ["Bruh... this hurts my soul a little ngl.", "I wanted to like it. I really did.", "The energy was there. The bake was... not."],
      disaster: ["I cannot. I physically CANNOT. This broke me.", "This is a hate crime against pastry.", "My tastebuds filed a complaint. I'm processing."],
    }
  },
];

function showJudgeReactions(pct) {
  const panel = document.getElementById('judge-panel');
  panel.innerHTML = '';

  const tier = pct === 1 ? 'perfect' : pct >= 0.6 ? 'good' : pct >= 0.3 ? 'bad' : 'disaster';
  const stars = pct === 1 ? '⭐⭐⭐' : pct >= 0.6 ? '⭐⭐' : pct >= 0.3 ? '⭐' : '💀';

  JUDGES.forEach((judge, i) => {
    const lines = judge.lines[tier];
    const line = lines[Math.floor(Math.random() * lines.length)];

    const card = document.createElement('div');
    card.className = 'judge-card';
    card.style.borderColor = judge.color;
    card.style.boxShadow = `0 6px 0 ${judge.color}`;
    card.style.animationDelay = `${i * 0.12}s`;
    card.innerHTML = `
      <div class="judge-avatar">${judge.avatar}</div>
      <div class="judge-name" style="color:${judge.color}">${judge.name}</div>
      <div class="judge-stars">${stars}</div>
      <div class="judge-line">"${line}"</div>
    `;
    panel.appendChild(card);
  });

  panel.classList.remove('hidden');
  void panel.offsetWidth;
  panel.classList.add('show');
}

function hideJudgePanel(onDone) {
  const panel = document.getElementById('judge-panel');
  panel.classList.remove('show');
  setTimeout(() => {
    panel.classList.add('hidden');
    onDone();
  }, 500);
}

const CHAOS_POOL = [
  { id: 'cat', weight: 3 },
  { id: 'flicker', weight: 3 },
  { id: 'dropped', weight: 2 },
  { id: 'hot', weight: 2 },
];

let chaosTimeout = null;
let hotOvenActive = false;
let hotOvenTimer = null;

function scheduleChaos() {
  clearTimeout(chaosTimeout);
  const base = Math.max(8000, 18000 - state.round * 400);
  const jitter = Math.random() * 4000;
  chaosTimeout = setTimeout(triggerChaos, base + jitter);
}

function stopChaos() {
  clearTimeout(chaosTimeout);
  chaosTimeout = null;
  cancelHotOven();
  const cat = document.getElementById('chaos-cat');
  cat.classList.remove('peeking');
  setTimeout(() => cat.classList.add('hidden'), 1200);
}

function triggerChaos() {
  if (state.baked || state.lives <= 0) return;

  if (state.shield) {
    state.shield = false;
    showChaosBanner("🛡️ Shield blocked the chaos!");
    scheduleChaos();
    return;
  }

  sfxChaosHit();

  // weighted random pick
  const total = CHAOS_POOL.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  let chosen = CHAOS_POOL[0];
  for (const e of CHAOS_POOL) { r -= e.weight; if (r <= 0) { chosen = e; break; } }

  switch (chosen.id) {
    case 'cat': chaosCat(); break;
    case 'flicker': chaosFlicker(); break;
    case 'dropped': chaosDropped(); break;
    case 'hot': chaosHotOven(); break;
  }

  scheduleChaos();
}

function chaosCat() {
  if (state.bowl.length === 0) return;

  const cat = document.getElementById('chaos-cat');
  cat.classList.remove('hidden');
  requestAnimationFrame(() => cat.classList.add('peeking'));
  showChaosBanner("A cat is stealing your ingredients! 🐱");

  setTimeout(() => {
    if (state.baked) { retractCat(); return; }

    const idx = Math.floor(Math.random() * state.bowl.length);
    const stolenId = state.bowl.splice(idx, 1)[0];
    renderBowl();
    updateTicket();

    const ingEl = document.getElementById('ing-' + stolenId);
    if (ingEl) ingEl.classList.remove('added');

    const ing = INGREDIENTS.find(i => i.id === stolenId);
    showChaosBanner(`Cat stole the ${ing?.name}! 😾`);
    setTimeout(retractCat, 1200);
  }, 900);
}

function retractCat() {
  const cat = document.getElementById('chaos-cat');
  cat.classList.remove('peeking');
  setTimeout(() => cat.classList.add('hidden'), 1300);
}

function chaosFlicker() {
  showChaosBanner("Power flicker! ⚡ Shelf scrambled!");

  const overlay = document.getElementById('flicker-overlay');
  overlay.classList.remove('hidden');
  overlay.style.opacity = '0';

  let tick = 0;
  const flicker = setInterval(() => {
    overlay.style.opacity = (tick % 2 === 0) ? '1' : '0';
    tick++;
    if (tick >= 7) {
      clearInterval(flicker);
      overlay.style.opacity = '0';
      overlay.classList.add('hidden');
      if (!state.baked) shuffleShelf();
    }
  }, 130);
}

function shuffleShelf() {
  const container = document.getElementById('ingredients');
  const children = Array.from(container.children);
  shuffle(children).forEach(el => container.appendChild(el));
}

function chaosDropped() {
  if (state.bowl.length === 0) return;

  const idx = Math.floor(Math.random() * state.bowl.length);
  const droppedId = state.bowl.splice(idx, 1)[0];
  renderBowl();
  updateTicket();

  const ingEl = document.getElementById('ing-' + droppedId);
  if (ingEl) ingEl.classList.remove('added');

  const ing = INGREDIENTS.find(i => i.id === droppedId);
  showChaosBanner(`Butter fingers! ${ing?.icon} fell on the floor! 🙈`);
}

function chaosHotOven() {
  if (hotOvenActive) return;
  hotOvenActive = true;

  document.getElementById('oven-body').classList.add('overheating');
  showChaosBanner("Oven overheating! Click it to cool down! 🌡️");

  hotOvenTimer = setTimeout(() => {
    if (!hotOvenActive) return;
    hotOvenActive = false;
    document.getElementById('oven-body').classList.remove('overheating');
    showChaosBanner("OVEN EXPLODED! 💥 Lost a life!");
    document.getElementById('screen-game').classList.add('shaking');
    setTimeout(() => document.getElementById('screen-game').classList.remove('shaking'), 400);
    loseLife();
  }, 5000);
}

function coolOven() {
  if (!hotOvenActive) return;
  hotOvenActive = false;
  clearTimeout(hotOvenTimer);
  document.getElementById('oven-body').classList.remove('overheating');
  showChaosBanner("Phew! Oven cooled! 🧊");
}

function cancelHotOven() {
  hotOvenActive = false;
  clearTimeout(hotOvenTimer);
  document.getElementById('oven-body').classList.remove('overheating');
}

let chaosBannerTimeout;
function showChaosBanner(msg) {
  const el = document.getElementById('chaos-banner');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(chaosBannerTimeout);
  chaosBannerTimeout = setTimeout(() => el.classList.remove('show'), 2200);
}

function updateCoinsHUD() {
  document.getElementById('hud-coins').textContent = '🪙 ' + state.coins;
}

const UPGRADES = [
  { id: 'life', icon: '❤️', name: 'Extra Life', cost: 50, desc: '+1 life (max 5)', color: '#FF6B9D' },
  { id: 'timer', icon: '⏱️', name: 'Timer Boost', cost: 30, desc: '+10s for 3 rounds', color: '#4D96FF' },
  { id: 'shield', icon: '🛡️', name: 'Chaos Shield', cost: 40, desc: 'Block next chaos event', color: '#C77DFF' },
  { id: 'scoreboost', icon: '💫', name: 'Score Boost', cost: 25, desc: '2× score next bake', color: '#FFD93D' },
];

let shopCallback = null;

function showShop(onDone) {
  sfxShopOpen();
  shopCallback = onDone;

  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';

  UPGRADES.forEach(upg => {
    const canAfford = state.coins >= upg.cost;
    const card = document.createElement('div');
    card.className = 'shop-card' + (canAfford ? '' : ' cant-afford');
    card.style.borderColor = upg.color;
    card.style.boxShadow = `0 6px 0 ${upg.color}`;
    card.innerHTML = `
      <div class="shop-icon">${upg.icon}</div>
      <div class="shop-name" style="color:${upg.color}">${upg.name}</div>
      <div class="shop-desc">${upg.desc}</div>
      <div class="shop-cost">🪙 ${upg.cost}</div>
    `;
    if (canAfford) card.addEventListener('click', () => buyUpgrade(upg.id));
    grid.appendChild(card);
  });

  document.getElementById('shop-subtitle').textContent = `You have 🪙 ${state.coins} coins`;
  document.getElementById('shop-overlay').classList.remove('hidden');
}

function buyUpgrade(id) {
  const upg = UPGRADES.find(u => u.id === id);
  if (!upg || state.coins < upg.cost) return;

  sfxCoin();
  state.coins -= upg.cost;
  updateCoinsHUD();

  switch (id) {
    case 'life': state.lives = Math.min(5, state.lives + 1); updateLivesHUD(); break;
    case 'timer': state.timerBoost += 3; break;
    case 'shield': state.shield = true; break;
    case 'scoreboost': state.scoreBoost = true; break;
  }

  showFeedback(`${upg.icon} ${upg.name}!`, upg.color);
  skipShop();
}

function skipShop() {
  document.getElementById('shop-overlay').classList.add('hidden');
  if (shopCallback) { shopCallback(); shopCallback = null; }
}

// audio stuff

let audioCtx = null;
let sfxGain = null;
let bgmGain = null;
let bgmInterval = null;
let isMuted = false;
let timerTickToggle = false;

const BGM_BPM = 130;
const BGM_BEAT = (60 / BGM_BPM) * 1000;

const BGM_MEL = [
  [392,1],[523,1],[659,2],[587,1],[523,1],[440,2],
  [523,1],[587,1],[659,2],[0,1],[440,1],[523,3],
  [659,1],[784,1],[880,2],[784,1],[659,1],[587,2],
  [523,1],[659,1],[784,2],[0,1],[587,1],[523,3],
];
const BGM_BASS = [131, 175, 196, 131, 131, 175, 196, 247];

let bgmBeat = 0, bgmMelIdx = 0, bgmBassIdx = 0, bgmMelLeft = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sfxGain = audioCtx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(audioCtx.destination);
  bgmGain = audioCtx.createGain(); bgmGain.gain.value = 0.16; bgmGain.connect(audioCtx.destination);
}

function toggleMute() {
  isMuted = !isMuted;
  if (audioCtx) {
    sfxGain.gain.value = isMuted ? 0 : 0.55;
    bgmGain.gain.value = isMuted ? 0 : 0.16;
  }
  document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🔊';
}

function _tone(freq, dur, vol, type, dest) {
  if (!audioCtx || isMuted) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(g); g.connect(dest || sfxGain);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function _sweep(f1, f2, dur, vol, type) {
  if (!audioCtx || isMuted) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(f1, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(f2, audioCtx.currentTime + dur);
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(g); g.connect(sfxGain);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function _noise(dur, vol, filterF, dest) {
  if (!audioCtx || isMuted) return;
  const len = Math.ceil(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = 'bandpass'; flt.frequency.value = filterF || 1000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  src.connect(flt); flt.connect(g); g.connect(dest || sfxGain);
  src.start();
}

function sfxPlop() { _tone(620, 0.06, 0.55); _tone(310, 0.1, 0.3); }
function sfxWrong() { _sweep(280, 155, 0.25, 0.6, 'sawtooth'); _noise(0.1, 0.2, 400); }
function sfxMix() { _sweep(280, 950, 0.28, 0.45, 'sine'); _noise(0.18, 0.2, 1500); }
function sfxBakeStart() { _noise(0.35, 0.5, 180); setTimeout(() => _noise(0.55, 0.28, 3500), 220); }
function sfxPerfect() {
  [523,659,784,1047].forEach((f,i) => setTimeout(() => _tone(f, 0.22, 0.45), i * 80));
  setTimeout(() => { _tone(1047, 0.55, 0.4); _tone(784, 0.55, 0.3); }, 360);
}
function sfxGood() { _tone(523, 0.11, 0.4); setTimeout(() => _tone(659, 0.2, 0.4), 110); }
function sfxBad() { _sweep(360, 215, 0.38, 0.42, 'triangle'); }
function sfxDisaster() { _sweep(450, 135, 0.75, 0.55, 'sawtooth'); _noise(0.35, 0.3, 280); }
function sfxTimerTick() { _tone(1100, 0.04, 0.28, 'square'); }
function sfxTimeUp() { [880,440,880,440].forEach((f,i) => setTimeout(() => _tone(f, 0.12, 0.42, 'square'), i*100)); }
function sfxChaosHit() { _tone(440, 0.07, 0.5, 'sawtooth'); _tone(466, 0.07, 0.4, 'sawtooth'); _noise(0.12, 0.4, 700); }
function sfxLoseLife() { _sweep(300, 95, 0.42, 0.55, 'sine'); _noise(0.22, 0.3, 140); }
function sfxGameOver() { [523,494,440,392,349,294,262].forEach((f,i) => setTimeout(() => _tone(f, 0.35, 0.52, 'sawtooth'), i*130)); }
function sfxCoin() { _tone(1047, 0.07, 0.45); setTimeout(() => _tone(1319, 0.13, 0.4), 60); }
function sfxShopOpen() { _tone(1319, 0.08, 0.42); setTimeout(() => _tone(1047, 0.13, 0.36), 70); _noise(0.08, 0.18, 5500); }
function sfxRound() { _tone(440, 0.07, 0.3); setTimeout(() => _tone(554, 0.07, 0.3), 60); setTimeout(() => _tone(659, 0.14, 0.36), 120); }

function startBGM() {
  if (bgmInterval) return;
  bgmBeat = 0; bgmMelIdx = 0; bgmBassIdx = 0; bgmMelLeft = 0;
  bgmTick();
  bgmInterval = setInterval(bgmTick, BGM_BEAT);
}

function stopBGM() {
  clearInterval(bgmInterval);
  bgmInterval = null;
}

function bgmTick() {
  if (!audioCtx || isMuted) return;
  const beatSec = BGM_BEAT / 1000;

  if (bgmMelLeft <= 0) {
    const [f, d] = BGM_MEL[bgmMelIdx % BGM_MEL.length];
    bgmMelLeft = d;
    bgmMelIdx++;
    if (f > 0) _tone(f, d * beatSec * 0.82, 0.22, 'sine', bgmGain);
  }
  bgmMelLeft--;

  if (bgmBeat % 4 === 0) {
    _tone(BGM_BASS[(bgmBassIdx++) % BGM_BASS.length], beatSec * 3.8, 0.38, 'triangle', bgmGain);
  }

  if (bgmBeat % 8 === 0 || bgmBeat % 8 === 4) {
    _sweep(190, 55, 0.1, 0.4, 'sine'); _noise(0.09, 0.35, 75, bgmGain);
  }

  if (bgmBeat % 8 === 2 || bgmBeat % 8 === 6) {
    _noise(0.09, 0.2, 2200, bgmGain);
  }

  if (bgmBeat % 2 === 1) _noise(0.04, 0.09, 10000, bgmGain);

  bgmBeat++;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
