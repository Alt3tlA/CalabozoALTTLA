const STORAGE_KEY = "damnatus-v4";
const STATS = ["FUERZA", "DESTREZA", "RESISTENCIA", "INTELIGENCIA", "CARISMA", "VIDA", "MANÁ"];
const CLASSES = ["Guerrero", "Caballero", "Pícaro", "Arquero", "Mago", "Sacerdote", "Invocador"];
const LEVELS = ["I", "II", "III", "IV", "V"];

const starterPortrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%232b2d24'/%3E%3Ccircle cx='200' cy='154' r='72' fill='%23d7a441'/%3E%3Cpath d='M86 468c18-112 78-178 114-178s96 66 114 178z' fill='%236fb0a6'/%3E%3Cpath d='M128 130c30-78 114-78 144 0-50-18-94-18-144 0z' fill='%2310140f'/%3E%3C/svg%3E";

let state = normalizeState(loadState());
let activeId = state.activeId;
let saveTimer;

const els = {
  characterList: document.querySelector("#characterList"),
  portraitPreview: document.querySelector("#portraitPreview"),
  portraitInput: document.querySelector("#portraitInput"),
  characterName: document.querySelector("#characterName"),
  characterClass: document.querySelector("#characterClass"),
  characterLevel: document.querySelector("#characterLevel"),
  difficulty: document.querySelector("#difficulty"),
  statsGrid: document.querySelector("#statsGrid"),
  campaignNotes: document.querySelector("#campaignNotes"),
  personalSkills: document.querySelector("#personalSkills"),
  uniqueSkills: document.querySelector("#uniqueSkills"),
  itemsList: document.querySelector("#itemsList"),
  summonsList: document.querySelector("#summonsList"),
  roundCounter: document.querySelector("#roundCounter"),
  dungeonCounter: document.querySelector("#dungeonCounter"),
  saveStatus: document.querySelector("#saveStatus"),
  effectTemplate: document.querySelector("#effectTemplate"),
  itemTemplate: document.querySelector("#itemTemplate"),
  summonTemplate: document.querySelector("#summonTemplate")
};

function emptyBonuses() {
  return Object.fromEntries(STATS.map((stat) => [stat, 0]));
}

function defaultEffect(index, prefix = "Habilidad") {
  return {
    id: crypto.randomUUID(),
    title: `${prefix} ${index + 1}`,
    level: "I",
    desc: "",
    bonuses: emptyBonuses(),
    cooldownType: "none",
    cooldownRounds: 1,
    availableRound: 0,
    lastUsedDungeon: null
  };
}

function defaultItem(index) {
  return {
    id: crypto.randomUUID(),
    title: `Objeto ${index + 1}`,
    desc: "",
    bonuses: emptyBonuses()
  };
}

function defaultSummon(index) {
  return {
    id: crypto.randomUUID(),
    name: `Invocado ${index + 1}`,
    stats: emptyBonuses()
  };
}

function defaultCharacter(index = 0) {
  return {
    id: crypto.randomUUID(),
    name: `Personaje ${index + 1}`,
    className: CLASSES[index % CLASSES.length],
    level: 1,
    difficulty: "normal",
    round: 0,
    dungeon: 0,
    portrait: starterPortrait,
    stats: Object.fromEntries(STATS.map((stat) => [stat, 8])),
    personalSkills: Array.from({ length: 10 }, (_, skillIndex) => defaultEffect(skillIndex, "Habilidad")),
    uniqueSkills: Array.from({ length: 3 }, (_, skillIndex) => defaultEffect(skillIndex, "Única")),
    items: [defaultItem(0)],
    summons: [],
    notes: ""
  };
}

function defaultState() {
  const character = defaultCharacter(0);
  return {
    activeId: character.id,
    characters: [character]
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultState();
  } catch {
    return defaultState();
  }
}

function normalizeState(rawState) {
  const base = rawState && Array.isArray(rawState.characters) ? rawState : defaultState();
  if (!base.characters.length) base.characters.push(defaultCharacter(0));

  const oldClassMap = {
    Exploradora: "Caballero",
    Guardian: "Pícaro",
    Arcanista: "Arquero",
    Diplomatica: "Mago",
    Sanadora: "Sacerdote",
    Sombramante: "Invocador"
  };

  base.characters.forEach((character, index) => {
    character.id = character.id || crypto.randomUUID();
    character.name = character.name || `Personaje ${index + 1}`;
    character.className = oldClassMap[character.className] || character.className || CLASSES[index % CLASSES.length];
    if (!CLASSES.includes(character.className)) character.className = CLASSES[index % CLASSES.length];
    character.level = Number(character.level || 1);
    character.difficulty = character.difficulty || "normal";
    character.round = Number(character.round ?? 0);
    character.dungeon = Number(character.dungeon ?? 0);
    character.portrait = character.portrait || starterPortrait;
    character.notes = character.notes || "";
    character.stats = normalizeStats(character.stats);
    character.personalSkills = (character.personalSkills || []).map((effect, effectIndex) => normalizeEffect(effect, effectIndex, "Habilidad"));
    character.uniqueSkills = (character.uniqueSkills || []).map((effect, effectIndex) => normalizeEffect(effect, effectIndex, "Única"));
    character.items = (character.items || []).map((item, itemIndex) => normalizeItem(item, itemIndex));
    character.summons = (character.summons || []).map((summon, summonIndex) => normalizeSummon(summon, summonIndex));
    while (character.personalSkills.length < 10) character.personalSkills.push(defaultEffect(character.personalSkills.length, "Habilidad"));
  });

  base.activeId = base.activeId || base.characters[0].id;
  return base;
}

function normalizeStats(stats = {}) {
  const normalized = emptyBonuses();
  STATS.forEach((stat) => {
    const oldIq = stat === "INTELIGENCIA" ? stats["INTELIGENCIA (IQ)"] : undefined;
    normalized[stat] = Number(stats[stat] ?? oldIq ?? 0);
  });
  return normalized;
}

function normalizeEffect(effect = {}, index = 0, prefix = "Habilidad") {
  const normalized = defaultEffect(index, prefix);
  normalized.id = effect.id || normalized.id;
  normalized.title = effect.title || normalized.title;
  normalized.level = LEVELS.includes(effect.level) ? effect.level : "I";
  normalized.desc = effect.desc || "";
  normalized.bonuses = normalizeStats(effect.bonuses || {});
  normalized.cooldownType = ["none", "rounds", "dungeon"].includes(effect.cooldownType) ? effect.cooldownType : "none";
  normalized.cooldownRounds = Math.max(1, Number(effect.cooldownRounds || 1));
  normalized.availableRound = Number(effect.availableRound || 0);
  normalized.lastUsedDungeon = effect.lastUsedDungeon ?? null;
  return normalized;
}

function normalizeItem(item = {}, index = 0) {
  const normalized = defaultItem(index);
  normalized.id = item.id || normalized.id;
  normalized.title = item.title || normalized.title;
  normalized.desc = item.desc || "";
  normalized.bonuses = normalizeStats(item.bonuses || {});
  return normalized;
}

function normalizeSummon(summon = {}, index = 0) {
  const normalized = defaultSummon(index);
  normalized.id = summon.id || normalized.id;
  normalized.name = summon.name || normalized.name;
  normalized.stats = normalizeStats(summon.stats || {});
  return normalized;
}

function currentCharacter() {
  return state.characters.find((character) => character.id === activeId) || state.characters[0];
}

function getTotalBonuses(character) {
  const totals = emptyBonuses();
  const sources = [...character.personalSkills, ...character.uniqueSkills, ...character.items];
  sources.forEach((source) => {
    STATS.forEach((stat) => {
      totals[stat] += Number(source.bonuses?.[stat] || 0);
    });
  });
  return totals;
}

function saveState() {
  state.activeId = activeId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.saveStatus.textContent = "Guardando...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    els.saveStatus.textContent = "Guardado";
  }, 350);
}

function renderClassOptions() {
  els.characterClass.innerHTML = "";
  CLASSES.forEach((className) => {
    const option = document.createElement("option");
    option.value = className;
    option.textContent = className;
    els.characterClass.append(option);
  });
}

function renderCharacterList() {
  els.characterList.innerHTML = "";
  state.characters.forEach((character) => {
    const button = document.createElement("button");
    button.className = `character-tab${character.id === activeId ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(character.name)}</strong><span>${escapeHtml(character.className)} · Nivel ${character.level}</span>`;
    button.addEventListener("click", () => {
      activeId = character.id;
      render();
      saveState();
    });
    els.characterList.append(button);
  });
}

function renderTrackers() {
  const character = currentCharacter();
  els.roundCounter.textContent = character.round;
  els.dungeonCounter.textContent = character.dungeon;
}

function renderStats(character) {
  const bonuses = getTotalBonuses(character);
  els.statsGrid.innerHTML = "";
  STATS.forEach((stat) => {
    const baseValue = Number(character.stats[stat] || 0);
    const bonusValue = Number(bonuses[stat] || 0);
    const totalValue = baseValue + bonusValue;
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `
      <div class="stat-label">
        <span>${stat}</span>
        <strong>${totalValue}</strong>
      </div>
      <div class="stat-meta">Base ${baseValue} · Extra ${formatBonus(bonusValue)}</div>
      <div class="stat-control">
        <button class="icon-button" type="button" aria-label="Bajar ${stat}">-</button>
        <input type="number" value="${baseValue}" aria-label="Base ${stat}" />
        <button class="icon-button" type="button" aria-label="Subir ${stat}">+</button>
      </div>
    `;
    const [down, input, up] = card.querySelectorAll("button, input");
    down.addEventListener("click", () => {
      input.value = Number(input.value || 0) - 1;
      character.stats[stat] = Number(input.value);
      saveState();
      renderStats(character);
    });
    up.addEventListener("click", () => {
      input.value = Number(input.value || 0) + 1;
      character.stats[stat] = Number(input.value);
      saveState();
      renderStats(character);
    });
    input.addEventListener("input", () => {
      const currentBase = Number(input.value || 0);
      character.stats[stat] = currentBase;
      card.querySelector(".stat-label strong").textContent = currentBase + bonusValue;
      card.querySelector(".stat-meta").textContent = `Base ${currentBase} · Extra ${formatBonus(bonusValue)}`;
      saveState();
    });
    els.statsGrid.append(card);
  });
}

function renderEffectRows(container, effects, prefix) {
  const character = currentCharacter();
  container.innerHTML = "";
  effects.forEach((effect, index) => {
    const node = els.effectTemplate.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".effect-title");
    const level = node.querySelector(".effect-level");
    const cooldownType = node.querySelector(".cooldown-type");
    const cooldownRounds = node.querySelector(".cooldown-rounds");
    const desc = node.querySelector(".effect-desc");
    const status = node.querySelector(".cooldown-status");
    const useButton = node.querySelector(".use-effect");
    const del = node.querySelector(".delete-effect");
    const bonuses = node.querySelector(".bonus-grid");

    title.value = effect.title;
    level.value = effect.level;
    cooldownType.value = effect.cooldownType;
    cooldownRounds.value = effect.cooldownRounds;
    desc.value = effect.desc;

    const availability = getAvailability(effect);
    status.textContent = availability.label;
    status.className = `cooldown-status ${availability.ready ? "ready" : "locked"}`;
    useButton.disabled = !availability.ready;
    cooldownRounds.disabled = effect.cooldownType !== "rounds";

    title.addEventListener("input", () => {
      effect.title = title.value;
      saveState();
    });
    level.addEventListener("change", () => {
      effect.level = level.value;
      saveState();
    });
    cooldownType.addEventListener("change", () => {
      effect.cooldownType = cooldownType.value;
      saveState();
      render();
    });
    cooldownRounds.addEventListener("input", () => {
      effect.cooldownRounds = Math.max(1, Number(cooldownRounds.value || 1));
      saveState();
    });
    desc.addEventListener("input", () => {
      effect.desc = desc.value;
      saveState();
    });
    useButton.addEventListener("click", () => useEffect(effect));
    del.addEventListener("click", () => {
      if (!confirm(`¿Eliminar ${prefix.toLowerCase()} "${effect.title}"?`)) return;
      effects.splice(index, 1);
      saveState();
      render();
    });

    renderBonusInputs(bonuses, effect.bonuses, () => {
      saveState();
      renderStats(character);
    });

    container.append(node);
  });
}

function renderItemRows(character) {
  els.itemsList.innerHTML = "";
  character.items.forEach((item, index) => {
    const node = els.itemTemplate.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".item-title");
    const desc = node.querySelector(".item-desc");
    const del = node.querySelector(".delete-item");
    const bonuses = node.querySelector(".bonus-grid");

    title.value = item.title;
    desc.value = item.desc;

    title.addEventListener("input", () => {
      item.title = title.value;
      saveState();
    });
    desc.addEventListener("input", () => {
      item.desc = desc.value;
      saveState();
    });
    del.addEventListener("click", () => {
      if (!confirm(`¿Eliminar objeto "${item.title}"?`)) return;
      character.items.splice(index, 1);
      saveState();
      render();
    });
    renderBonusInputs(bonuses, item.bonuses, () => {
      saveState();
      renderStats(character);
    });

    els.itemsList.append(node);
  });
}

function renderSummons(character) {
  els.summonsList.innerHTML = "";
  character.summons.forEach((summon, index) => {
    const node = els.summonTemplate.content.firstElementChild.cloneNode(true);
    const name = node.querySelector(".summon-name");
    const del = node.querySelector(".delete-summon");
    const stats = node.querySelector(".summon-stats-grid");

    name.value = summon.name;
    name.addEventListener("input", () => {
      summon.name = name.value;
      saveState();
    });
    del.addEventListener("click", () => {
      if (!confirm(`¿Eliminar invocado "${summon.name}"?`)) return;
      character.summons.splice(index, 1);
      saveState();
      render();
    });

    STATS.forEach((stat) => {
      const label = document.createElement("label");
      label.className = "bonus-field";
      label.innerHTML = `<span>${stat}</span><input type="number" value="${Number(summon.stats[stat] || 0)}" />`;
      const input = label.querySelector("input");
      input.addEventListener("input", () => {
        summon.stats[stat] = Number(input.value || 0);
        saveState();
      });
      stats.append(label);
    });

    els.summonsList.append(node);
  });
}

function renderBonusInputs(container, bonuses, onChange) {
  container.innerHTML = "";
  STATS.forEach((stat) => {
    const label = document.createElement("label");
    label.className = "bonus-field";
    label.innerHTML = `<span>${stat}</span><input type="number" value="${Number(bonuses[stat] || 0)}" />`;
    const input = label.querySelector("input");
    input.addEventListener("input", () => {
      bonuses[stat] = Number(input.value || 0);
      onChange();
    });
    container.append(label);
  });
}

function getAvailability(effect) {
  const character = currentCharacter();
  if (effect.cooldownType === "rounds") {
    const remaining = Math.max(0, Number(effect.availableRound || 0) - character.round);
    return remaining > 0
      ? { ready: false, label: `Enfriamiento: faltan ${remaining} ronda(s)` }
      : { ready: true, label: "Disponible por rondas" };
  }

  if (effect.cooldownType === "dungeon") {
    return effect.lastUsedDungeon === character.dungeon
      ? { ready: false, label: "Enfriamiento: hasta finalizar mazmorra" }
      : { ready: true, label: "Disponible por mazmorra" };
  }

  return { ready: true, label: "Sin enfriamiento" };
}

function useEffect(effect) {
  const availability = getAvailability(effect);
  if (!availability.ready) {
    alert(availability.label);
    return;
  }
  if (!confirm(`¿Usar "${effect.title}"?`)) return;

  if (effect.cooldownType === "rounds") {
    effect.availableRound = currentCharacter().round + Math.max(1, Number(effect.cooldownRounds || 1));
  }
  if (effect.cooldownType === "dungeon") {
    effect.lastUsedDungeon = currentCharacter().dungeon;
  }

  saveState();
  render();
}

function render() {
  const character = currentCharacter();
  activeId = character.id;

  renderTrackers();
  renderCharacterList();
  els.portraitPreview.src = character.portrait;
  els.characterName.value = character.name;
  els.characterClass.value = character.className;
  els.characterLevel.value = character.level;
  els.difficulty.value = character.difficulty;
  els.campaignNotes.value = character.notes || "";
  renderStats(character);
  renderEffectRows(els.personalSkills, character.personalSkills, "Habilidad");
  renderEffectRows(els.uniqueSkills, character.uniqueSkills, "Habilidad única");
  renderItemRows(character);
  renderSummons(character);
}

function bindInputs() {
  els.characterName.addEventListener("input", () => {
    currentCharacter().name = els.characterName.value;
    saveState();
    renderCharacterList();
  });
  els.characterClass.addEventListener("change", () => {
    currentCharacter().className = els.characterClass.value;
    saveState();
    renderCharacterList();
  });
  els.characterLevel.addEventListener("input", () => {
    currentCharacter().level = Number(els.characterLevel.value || 1);
    saveState();
    renderCharacterList();
  });
  els.difficulty.addEventListener("change", () => {
    currentCharacter().difficulty = els.difficulty.value;
    saveState();
  });
  els.campaignNotes.addEventListener("input", () => {
    currentCharacter().notes = els.campaignNotes.value;
    saveState();
  });
  els.portraitInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    currentCharacter().portrait = await readFileAsDataUrl(file);
    saveState();
    render();
  });

  document.querySelector("#addCharacterBtn").addEventListener("click", () => {
    const character = defaultCharacter(state.characters.length);
    state.characters.push(character);
    activeId = character.id;
    saveState();
    render();
  });
  document.querySelector("#deleteCharacterBtn").addEventListener("click", () => {
    if (state.characters.length <= 1) {
      alert("Debe quedar al menos un personaje.");
      return;
    }
    const character = currentCharacter();
    if (!confirm(`¿Eliminar el personaje "${character.name}"?`)) return;
    state.characters = state.characters.filter((item) => item.id !== character.id);
    activeId = state.characters[0].id;
    saveState();
    render();
  });
  document.querySelector("#addPersonalSkill").addEventListener("click", () => {
    const character = currentCharacter();
    character.personalSkills.push(defaultEffect(character.personalSkills.length, "Habilidad"));
    saveState();
    render();
  });
  document.querySelector("#addUniqueSkill").addEventListener("click", () => {
    const character = currentCharacter();
    character.uniqueSkills.push(defaultEffect(character.uniqueSkills.length, "Única"));
    saveState();
    render();
  });
  document.querySelector("#addItem").addEventListener("click", () => {
    const character = currentCharacter();
    character.items.push(defaultItem(character.items.length));
    saveState();
    render();
  });
  document.querySelector("#addSummon").addEventListener("click", () => {
    const character = currentCharacter();
    character.summons.push(defaultSummon(character.summons.length));
    saveState();
    render();
  });
  document.querySelector("#endTurnBtn").addEventListener("click", () => {
    currentCharacter().round += 1;
    saveState();
    render();
  });
  document.querySelector("#endDungeonBtn").addEventListener("click", () => {
    if (!confirm("¿Finalizar la mazmorra actual? Se recuperarán habilidades con enfriamiento por mazmorra.")) return;
    const character = currentCharacter();
    character.dungeon += 1;
    character.round = 0;
    saveState();
    render();
  });
  document.querySelector("#newCampaignBtn").addEventListener("click", () => {
    if (!confirm("Esto reemplaza la campaña guardada en este navegador. Exporta antes si quieres conservarla.")) return;
    state = defaultState();
    activeId = state.activeId;
    saveState();
    render();
  });
  document.querySelector("#exportBtn").addEventListener("click", exportCampaign);
  document.querySelector("#importInput").addEventListener("change", importCampaign);
}

function exportCampaign() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "damnatus-campana.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importCampaign(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.characters)) {
    alert("El archivo no parece ser una campaña válida.");
    return;
  }
  state = normalizeState(parsed);
  activeId = state.activeId || state.characters[0].id;
  saveState();
  render();
  event.target.value = "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBonus(value) {
  return value > 0 ? `+${value}` : String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderClassOptions();
bindInputs();
render();
