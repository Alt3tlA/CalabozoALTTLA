const STORAGE_KEY = "cronicas-calabozo-v3";
const STATS = ["FUERZA", "DESTREZA", "RESISTENCIA", "INTELIGENCIA (IQ)", "CARISMA", "VIDA", "MANA"];
const CLASSES = ["Guerrero", "Caballero", "Pícaro", "Arquero", "Mago", "Sacerdote", "Invocador"];
const LEVELS = ["I", "II", "III", "IV", "V"];

const starterPortraits = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%232b2d24'/%3E%3Ccircle cx='200' cy='154' r='72' fill='%23d7a441'/%3E%3Cpath d='M86 468c18-112 78-178 114-178s96 66 114 178z' fill='%236fb0a6'/%3E%3Cpath d='M128 130c30-78 114-78 144 0-50-18-94-18-144 0z' fill='%2310140f'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%231b2528'/%3E%3Ccircle cx='200' cy='150' r='68' fill='%23c88b62'/%3E%3Cpath d='M78 472c24-102 74-172 122-172s98 70 122 172z' fill='%2389b36b'/%3E%3Cpath d='M110 176l90-118 90 118c-54-34-126-34-180 0z' fill='%23332318'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%2321222d'/%3E%3Ccircle cx='200' cy='156' r='70' fill='%23b7a38a'/%3E%3Cpath d='M72 468c28-120 86-166 128-166s100 46 128 166z' fill='%23969ea8'/%3E%3Cpath d='M126 94h148v52H126z' fill='%23d7a441'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%23191525'/%3E%3Ccircle cx='200' cy='150' r='64' fill='%23d2b48c'/%3E%3Cpath d='M82 470c20-112 74-178 118-178s98 66 118 178z' fill='%237568b2'/%3E%3Cpath d='M118 80h164l-38 94H156z' fill='%236fb0a6'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%2327191a'/%3E%3Ccircle cx='200' cy='152' r='68' fill='%23c98f72'/%3E%3Cpath d='M86 470c20-104 78-170 114-170s94 66 114 170z' fill='%23d7a441'/%3E%3Cpath d='M134 96c42-48 90-48 132 0-24 28-108 28-132 0z' fill='%234a2d21'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%23152720'/%3E%3Ccircle cx='200' cy='150' r='66' fill='%23d1aa7b'/%3E%3Cpath d='M76 470c30-108 82-172 124-172s94 64 124 172z' fill='%23f0f0df'/%3E%3Cpath d='M128 102c44-54 100-54 144 0v72H128z' fill='%236fb0a6'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%23120f15'/%3E%3Ccircle cx='200' cy='154' r='66' fill='%23ad8264'/%3E%3Cpath d='M80 470c24-116 82-176 120-176s96 60 120 176z' fill='%234d5b66'/%3E%3Cpath d='M104 160c20-84 172-84 192 0-58-38-134-38-192 0z' fill='%23080a08'/%3E%3C/svg%3E"
];

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
  saveStatus: document.querySelector("#saveStatus"),
  rowTemplate: document.querySelector("#rowTemplate"),
  skillTemplate: document.querySelector("#skillTemplate")
};

function defaultSkill(index) {
  return {
    title: `Habilidad ${index + 1}`,
    level: "I",
    cooldown: "",
    desc: "Personaliza el efecto, costo, alcance y requisitos.",
    bonuses: Object.fromEntries(STATS.map((stat) => [stat, 0]))
  };
}

function defaultState() {
  const characters = CLASSES.map((className, index) => {
    const base = 8 + index;
    return {
      id: crypto.randomUUID(),
      name: `Personaje ${index + 1}`,
      className,
      level: 1,
      difficulty: "normal",
      portrait: starterPortraits[index],
      stats: Object.fromEntries(STATS.map((stat, statIndex) => [stat, base + statIndex])),
      personalSkills: Array.from({ length: 10 }, (_, skillIndex) => defaultSkill(skillIndex)),
      uniqueSkills: Array.from({ length: 30 }, (_, skillIndex) => ({
        title: `Única ${skillIndex + 1}`,
        desc: "Disponible según dificultad, historia o recompensa."
      })),
      items: [
        { title: "Poción menor", desc: "Recupera vida durante o fuera del combate." },
        { title: "Ración de viaje", desc: "Sostiene al grupo en una jornada larga." },
        { title: "Reliquia sin identificar", desc: "Objeto misterioso para revelar en sesión." }
      ],
      notes: ""
    };
  });

  return { activeId: characters[0].id, characters };
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
  const oldClassMap = {
    Exploradora: "Caballero",
    Guardian: "Pícaro",
    Arcanista: "Arquero",
    Diplomatica: "Mago",
    Sanadora: "Sacerdote",
    Sombramante: "Invocador"
  };

  base.characters.forEach((character, index) => {
    character.className = oldClassMap[character.className] || character.className || CLASSES[index] || CLASSES[0];
    if (!CLASSES.includes(character.className)) character.className = CLASSES[index] || CLASSES[0];
    character.stats = character.stats || {};
    STATS.forEach((stat) => {
      character.stats[stat] = Number(character.stats[stat] || 0);
    });
    character.personalSkills = (character.personalSkills || []).map((skill, skillIndex) => normalizeSkill(skill, skillIndex));
    while (character.personalSkills.length < 10) character.personalSkills.push(defaultSkill(character.personalSkills.length));
    character.uniqueSkills = character.uniqueSkills || [];
    character.items = character.items || [];
    character.notes = character.notes || "";
    character.portrait = character.portrait || starterPortraits[index % starterPortraits.length];
  });

  base.activeId = base.activeId || base.characters[0]?.id;
  return base;
}

function normalizeSkill(skill, index) {
  return {
    title: skill.title || `Habilidad ${index + 1}`,
    level: LEVELS.includes(skill.level) ? skill.level : "I",
    cooldown: skill.cooldown || "",
    desc: skill.desc || "",
    bonuses: {
      ...Object.fromEntries(STATS.map((stat) => [stat, 0])),
      ...(skill.bonuses || {})
    }
  };
}

function currentCharacter() {
  return state.characters.find((character) => character.id === activeId) || state.characters[0];
}

function getSkillBonuses(character) {
  const totals = Object.fromEntries(STATS.map((stat) => [stat, 0]));
  character.personalSkills.forEach((skill) => {
    STATS.forEach((stat) => {
      totals[stat] += Number(skill.bonuses?.[stat] || 0);
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

function renderStats(character) {
  const bonuses = getSkillBonuses(character);
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
      character.stats[stat] = Number(input.value || 0);
      const currentBase = Number(input.value || 0);
      card.querySelector(".stat-label strong").textContent = currentBase + bonusValue;
      card.querySelector(".stat-meta").textContent = `Base ${currentBase} · Extra ${formatBonus(bonusValue)}`;
      saveState();
    });
    els.statsGrid.append(card);
  });
}

function renderSkillRows(character) {
  els.personalSkills.innerHTML = "";
  character.personalSkills.forEach((skill, index) => {
    const node = els.skillTemplate.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".skill-title");
    const level = node.querySelector(".skill-level");
    const cooldown = node.querySelector(".skill-cooldown");
    const desc = node.querySelector(".skill-desc");
    const bonuses = node.querySelector(".bonus-grid");
    const del = node.querySelector(".delete-skill");

    title.value = skill.title;
    level.value = skill.level;
    cooldown.value = skill.cooldown;
    desc.value = skill.desc;

    title.addEventListener("input", () => {
      skill.title = title.value;
      saveState();
    });
    level.addEventListener("change", () => {
      skill.level = level.value;
      saveState();
    });
    cooldown.addEventListener("input", () => {
      skill.cooldown = cooldown.value;
      saveState();
    });
    desc.addEventListener("input", () => {
      skill.desc = desc.value;
      saveState();
    });
    del.addEventListener("click", () => {
      character.personalSkills.splice(index, 1);
      saveState();
      render();
    });

    STATS.forEach((stat) => {
      const label = document.createElement("label");
      label.className = "bonus-field";
      label.innerHTML = `<span>${stat}</span><input type="number" value="${Number(skill.bonuses[stat] || 0)}" />`;
      const input = label.querySelector("input");
      input.addEventListener("input", () => {
        skill.bonuses[stat] = Number(input.value || 0);
        saveState();
        renderStats(character);
      });
      bonuses.append(label);
    });

    els.personalSkills.append(node);
  });
}

function renderRows(container, rows, placeholderTitle, placeholderDesc) {
  container.innerHTML = "";
  rows.forEach((row, index) => {
    const node = els.rowTemplate.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".row-title");
    const desc = node.querySelector(".row-desc");
    const del = node.querySelector(".delete-row");
    title.value = row.title;
    title.placeholder = placeholderTitle;
    desc.value = row.desc;
    desc.placeholder = placeholderDesc;
    title.addEventListener("input", () => {
      row.title = title.value;
      saveState();
    });
    desc.addEventListener("input", () => {
      row.desc = desc.value;
      saveState();
    });
    del.addEventListener("click", () => {
      rows.splice(index, 1);
      saveState();
      render();
    });
    container.append(node);
  });
}

function render() {
  const character = currentCharacter();
  activeId = character.id;

  renderCharacterList();
  els.portraitPreview.src = character.portrait;
  els.characterName.value = character.name;
  els.characterClass.value = character.className;
  els.characterLevel.value = character.level;
  els.difficulty.value = character.difficulty;
  els.campaignNotes.value = character.notes || "";
  renderStats(character);
  renderSkillRows(character);
  renderRows(els.uniqueSkills, character.uniqueSkills, "Nombre de habilidad única", "Disponibilidad, dificultad y efecto");
  renderRows(els.itemsList, character.items, "Nombre del objeto", "Para qué sirve");
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

  document.querySelector("#addPersonalSkill").addEventListener("click", () => {
    currentCharacter().personalSkills.push(defaultSkill(currentCharacter().personalSkills.length));
    saveState();
    render();
  });
  document.querySelector("#addUniqueSkill").addEventListener("click", () => addRow("uniqueSkills", "Nueva habilidad única", "Define dificultad, desbloqueo y efecto."));
  document.querySelector("#addItem").addEventListener("click", () => addRow("items", "Nuevo objeto", "Describe para qué sirve."));
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

function addRow(collection, title, desc) {
  currentCharacter()[collection].push({ title, desc });
  saveState();
  render();
}

function exportCampaign() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "campana-calabozos.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importCampaign(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const imported = normalizeState(JSON.parse(text));
  if (!Array.isArray(imported.characters)) {
    alert("El archivo no parece ser una campaña válida.");
    return;
  }
  state = imported;
  activeId = imported.activeId || imported.characters[0].id;
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
