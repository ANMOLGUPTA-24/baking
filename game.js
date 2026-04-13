// ═══════════════════════════════════════════════════
//  BAKE & SURVIVE — game.js  (Day 1: UI + Ingredients)
// ═══════════════════════════════════════════════════

// ── DATA ────────────────────────────────────────────

const INGREDIENTS = [
  { id: "flour",    icon: "🌾", name: "Flour"    },
  { id: "butter",   icon: "🧈", name: "Butter"   },
  { id: "sugar",    icon: "🍚", name: "Sugar"    },
  { id: "eggs",     icon: "🥚", name: "Eggs"     },
  { id: "milk",     icon: "🥛", name: "Milk"     },
  { id: "choc",     icon: "🍫", name: "Choc"     },
  { id: "bpowder",  icon: "🫙", name: "B.Powder" },
  { id: "vanilla",  icon: "🌿", name: "Vanilla"  },
  { id: "cinnamon", icon: "🫚", name: "Cinnamon" },
  { id: "strawb",   icon: "🍓", name: "Strawb."  },
  { id: "salt",     icon: "🧂", name: "Salt"     },
  { id: "yeast",    icon: "🟤", name: "Yeast"    },
];

const RECIPES = [
  {
    name: "Victoria Sponge 🎂",
    required: ["flour","butter","sugar","eggs","bpowder"],
    decoys:   ["salt","cinnamon","yeast"],
  },
  {
    name: "Choc Lava Cake 🍫",
    required: ["choc","butter","eggs","sugar","flour"],
    decoys:   ["milk","yeast","cinnamon"],
  },
  {
    name: "Cinnamon Rolls 🥐",
    required: ["flour","yeast","milk","butter","cinnamon","sugar"],
    decoys:   ["bpowder","choc","salt"],
  },
  {
    name: "Strawberry Shortcake 🍓",
    required: ["flour","butter","sugar","strawb","milk"],
    decoys:   ["yeast","choc","cinnamon"],
  },
  {
    name: "Banana Bread 🍌",
    required: ["flour","sugar","eggs","butter","bpowder","vanilla"],
    decoys:   ["choc","yeast","salt"],
  },
];

// ── STATE ───────────────────────────────────────────

let state = {
  score:   0,
  lives:   3,
  round:   1,
  streak:  0,
  bowl:    [],     // ids of ingredients in bowl
  mixed:   false,
  baked:   false,
  recipe:  null,
  timerPct: 100,
  timerInterval: null,
};

// ── BOOT ────────────────────────────────────────────

function showGame() {
  document.getElementById('screen-start').classList.remove('active');
  document.getElementById('screen-game').classList.add('active');
  buildIngredientShelf();
  showOrderFlash(() => newOrder());
}

// ── INGREDIENT SHELF ────────────────────────────────

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

// ── ORDER / RECIPE ───────────────────────────────────

function newOrder() {
  // Reset bowl & state
  state.bowl  = [];
  state.mixed = false;
  state.baked = false;
  renderBowl();

  // Reset oven
  document.getElementById('oven-contents').textContent = '🕳️';

  // Pick a random recipe (avoid repeating last)
  let pick;
  do { pick = RECIPES[Math.floor(Math.random() * RECIPES.length)]; }
  while (RECIPES.length > 1 && pick === state.recipe);
  state.recipe = pick;

  // Build ingredient shelf for this round (required + decoys, shuffled)
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

  // Ticket
  document.getElementById('ticket-title').textContent = state.recipe.name;
  const ul = document.getElementById('ticket-list');
  ul.innerHTML = state.recipe.required
    .map(id => {
      const ing = INGREDIENTS.find(i => i.id === id);
      return `<li id="tick-${id}">${ing?.icon} ${ing?.name}</li>`;
    }).join('');

  // HUD
  document.getElementById('hud-order').textContent = state.recipe.name;
  document.getElementById('hud-round').textContent = state.round;
  updateLivesHUD();
  updateStreakHUD();

  // Timer gets shorter every 3 rounds, floors at 20s
  const timerSecs = Math.max(20, 60 - Math.floor((state.round - 1) / 3) * 5);
  startTimer(timerSecs);
}

function updateTicket() {
  state.recipe.required.forEach(id => {
    const li = document.getElementById('tick-' + id);
    if (!li) return;
    li.classList.toggle('done', state.bowl.includes(id));
  });
}

// ── INGREDIENT CLICK ─────────────────────────────────

function clickIngredient(ing) {
  if (state.baked) return;

  const el = document.getElementById('ing-' + ing.id);
  if (!el || el.classList.contains('added')) return;

  const isNeeded = state.recipe.required.includes(ing.id);
  const alreadyIn = state.bowl.includes(ing.id);

  if (!isNeeded || alreadyIn) {
    // Wrong ingredient
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 500);
    document.getElementById('screen-game').classList.add('shaking');
    setTimeout(() => document.getElementById('screen-game').classList.remove('shaking'), 400);
    loseLife();
    showFeedback(["Eww, really? 🤢", "Nope! ❌", "That's NOT it 😬", "Wrong ingredient! 🙃"][Math.floor(Math.random()*4)], '#FF6B9D');
    return;
  }

  // Correct — animate fly to bowl
  flyToBowl(el, ing, () => {
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

  // Start position (ingredient button center)
  const src = el.getBoundingClientRect();
  clone.style.left    = (src.left + src.width/2 - 12) + 'px';
  clone.style.top     = (src.top  + src.height/2 - 12) + 'px';
  clone.style.opacity = '1';
  clone.style.transform = 'scale(1)';

  // Target position (bowl center)
  const bowl = document.getElementById('bowl').getBoundingClientRect();
  const tx = bowl.left + bowl.width/2 - 12;
  const ty = bowl.top  + bowl.height/2 - 12;

  // Force reflow, then animate
  void clone.offsetWidth;
  clone.classList.add('flying');
  clone.style.left      = tx + 'px';
  clone.style.top       = ty + 'px';
  clone.style.opacity   = '0';
  clone.style.transform = 'scale(0.3) rotate(360deg)';

  setTimeout(() => {
    clone.classList.add('hidden');
    clone.classList.remove('flying');
    onDone();
  }, 460);
}

// ── BOWL ────────────────────────────────────────────

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

// ── MIX ─────────────────────────────────────────────

function mixBowl() {
  if (state.bowl.length === 0) {
    showFeedback("Bowl is empty! 😅", '#4D96FF');
    return;
  }
  state.mixed = true;
  // Visual bounce on bowl
  const bowl = document.getElementById('bowl');
  bowl.style.transform = 'scale(1.15)';
  setTimeout(() => bowl.style.transform = '', 200);
  showFeedback("Mixed! 🥄", '#FFD93D');
}

// ── BAKE ─────────────────────────────────────────────

function bakeIt() {
  if (!state.mixed) {
    showFeedback("Mix it first! 🥄", '#4D96FF');
    return;
  }
  if (state.baked) return;

  state.baked = true;
  clearInterval(state.timerInterval);

  // Check how many correct ingredients
  const needed   = state.recipe.required;
  const correct  = needed.filter(id => state.bowl.includes(id)).length;
  const pct      = correct / needed.length;

  // Streak
  if (pct === 1) {
    state.streak++;
  } else {
    state.streak = 0;
  }
  updateStreakHUD();

  // Score (with streak multiplier)
  const multiplier = 1 + Math.floor(state.streak / 3) * 0.5;
  const earned = Math.round((Math.round(pct * 100) + Math.floor(state.timerPct * 0.3)) * multiplier);
  state.score += earned;
  document.getElementById('hud-score').textContent = state.score;

  // Oven animation
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

    const streakBonus = state.streak >= 3 ? ` (x${(1 + Math.floor(state.streak/3)*0.5).toFixed(1)} streak!)` : '';
    showFeedback(msgs[Math.floor(Math.random() * msgs.length)] + streakBonus, pct >= 0.6 ? '#6BCB77' : '#FF6B35');

    setTimeout(() => {
      state.round++;
      showOrderFlash(() => newOrder());
    }, 1800);
  }, 1200);
}

// ── TIMER ────────────────────────────────────────────

function startTimer(seconds) {
  clearInterval(state.timerInterval);
  state.timerPct = 100;
  updateTimerBar();

  const step = 100 / (seconds * 2); // tick every 500ms
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
}

function onTimeUp() {
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

// ── LIVES ────────────────────────────────────────────

function loseLife() {
  state.lives = Math.max(0, state.lives - 1);
  updateLivesHUD();
  if (state.lives === 0) gameOver();
}

function updateLivesHUD() {
  const hearts = ['❤️','❤️','❤️'].map((h, i) => i < state.lives ? h : '🖤').join('');
  document.getElementById('hud-lives').textContent = hearts;
}

function gameOver() {
  clearInterval(state.timerInterval);
  showFeedback(`GAME OVER! Score: ${state.score} 💀`, '#FF6B35');
  setTimeout(() => {
    if (confirm(`Game Over!\nRound: ${state.round} | Score: ${state.score}\nPlay again?`)) {
      state.score = 0; state.lives = 3; state.round = 1; state.streak = 0;
      document.getElementById('hud-score').textContent = '0';
      showOrderFlash(() => newOrder());
    }
  }, 1200);
}

// ── STREAK HUD ───────────────────────────────────────

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

// ── ORDER FLASH OVERLAY ──────────────────────────────

function showOrderFlash(onDone) {
  const overlay = document.getElementById('order-overlay');
  const text    = document.getElementById('order-overlay-text');
  const round   = state.round;

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

// ── FEEDBACK POPUP ───────────────────────────────────

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

// ── UTILS ────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
