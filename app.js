const STORAGE_KEY = "damnatus-v30-firebase";
const CAMPAIGN_ID = window.DAMNATUS_CAMPAIGN_ID || "damnatus";
const STATS = ["FUERZA", "DESTREZA", "RESISTENCIA", "INTELIGENCIA", "CARISMA", "VIDA", "MANÁ"];
const CLASSES = ["Guerrero", "Caballero", "Pícaro", "Arquero", "Mago", "Sacerdote", "Invocador"];
const LEVELS = ["I", "II", "III", "IV", "V"];

const starterPortrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 520'%3E%3Crect width='400' height='520' fill='%232b2d24'/%3E%3Ccircle cx='200' cy='154' r='72' fill='%23d7a441'/%3E%3Cpath d='M86 468c18-112 78-178 114-178s96 66 114 178z' fill='%236fb0a6'/%3E%3Cpath d='M128 130c30-78 114-78 144 0-50-18-94-18-144 0z' fill='%2310140f'/%3E%3C/svg%3E";

let state = normalizeState(loadState());
let activeId = state.activeId;
let saveTimer;
let onlineSaveTimer;
let onlineSync = {
  app: null,
  db: null,
  roomRef: null,
  roomKey: CAMPAIGN_ID,
  campaign: null,
  enabled: false,
  applyingRemote: false,
  lastWriteId: ""
};

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
  serverName: document.querySelector("#serverName"),
  serverId: document.querySelector("#serverId"),
  joinTarget: document.querySelector("#joinTarget"),
  participantName: document.querySelector("#participantName"),
  participantCharacter: document.querySelector("#participantCharacter"),
  confirmDmBtn: document.querySelector("#confirmDmBtn"),
  addPlayerBtn: document.querySelector("#addPlayerBtn"),
  activePeopleCount: document.querySelector("#activePeopleCount"),
  activePeopleList: document.querySelector("#activePeopleList"),
  connectionStatus: document.querySelector("#connectionStatus"),
  connectionHint: document.querySelector("#connectionHint"),
  levelPermission: document.querySelector("#levelPermission"),
  levelUpBtn: document.querySelector("#levelUpBtn"),
  partyLevelCap: document.querySelector("#partyLevelCap"),
  globalLevelPermission: document.querySelector("#globalLevelPermission"),
  approveActiveLevelBtn: document.querySelector("#approveActiveLevelBtn"),
  syncPartyLevelBtn: document.querySelector("#syncPartyLevelBtn"),
  dmTargetCharacter: document.querySelector("#dmTargetCharacter"),
  dmCopperAmount: document.querySelector("#dmCopperAmount"),
  dmRewardItem: document.querySelector("#dmRewardItem"),
  dmStateName: document.querySelector("#dmStateName"),
  dmRewardNote: document.querySelector("#dmRewardNote"),
  dmLevelDownBtn: document.querySelector("#dmLevelDownBtn"),
  dmLevelUpBtn: document.querySelector("#dmLevelUpBtn"),
  dmGiveCopperBtn: document.querySelector("#dmGiveCopperBtn"),
  dmGiveItemBtn: document.querySelector("#dmGiveItemBtn"),
  dmApplyStateBtn: document.querySelector("#dmApplyStateBtn"),
  dmClearStateBtn: document.querySelector("#dmClearStateBtn"),
  dmControlHint: document.querySelector("#dmControlHint"),
  botCopper: document.querySelector("#botCopper"),
  botStatesCount: document.querySelector("#botStatesCount"),
  botInventoryList: document.querySelector("#botInventoryList"),
  botHistoryList: document.querySelector("#botHistoryList"),
  effectTemplate: document.querySelector("#effectTemplate"),
  itemTemplate: document.querySelector("#itemTemplate"),
  summonTemplate: document.querySelector("#summonTemplate")
};

Object.assign(els, {
  lobbyView: document.querySelector("#lobbyView"),
  gameView: document.querySelector("#gameView"),
  lobbyServerName: document.querySelector("#lobbyServerName"),
  lobbyServerId: document.querySelector("#lobbyServerId"),
  lobbyDmName: document.querySelector("#lobbyDmName"),
  lobbyJoinTarget: document.querySelector("#lobbyJoinTarget"),
  lobbyPlayerDiscordId: document.querySelector("#lobbyPlayerDiscordId"),
  lobbyPlayerCharacter: document.querySelector("#lobbyPlayerCharacter"),
  lobbyPeopleCount: document.querySelector("#lobbyPeopleCount"),
  lobbyPeopleList: document.querySelector("#lobbyPeopleList"),
  lobbyStatus: document.querySelector("#lobbyStatus"),
  createLobbyBtn: document.querySelector("#createLobbyBtn"),
  generatePinBtn: document.querySelector("#generatePinBtn"),
  lobbyAddPlayerBtn: document.querySelector("#lobbyAddPlayerBtn"),
  enterGameBtn: document.querySelector("#enterGameBtn"),
  resetLobbyBtn: document.querySelector("#resetLobbyBtn"),
  backToLobbyBtn: document.querySelector("#backToLobbyBtn")
});

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
    stats: Object.fromEntries(STATS.map((stat) => [stat, 0])),
    personalSkills: Array.from({ length: 10 }, (_, skillIndex) => defaultEffect(skillIndex, "Habilidad")),
    uniqueSkills: Array.from({ length: 3 }, (_, skillIndex) => defaultEffect(skillIndex, "Única")),
    items: [defaultItem(0)],
    summons: [],
    notes: "",
    cobre: 0,
    inventory: [],
    history: [],
    states: [],
    ownerDiscordId: ""
  };
}

function defaultState() {
  const character = defaultCharacter(0);
  return {
    table: defaultTable(),
    activeId: character.id,
    characters: [character]
  };
}

function defaultTable() {
  return {
    serverName: "Mesa DAMNATUS",
    serverId: createServerId(),
    joinTarget: "",
    view: "lobby",
    role: "dm",
    dmConfirmed: false,
    participants: [],
    onlineStatus: "local",
    levelPermission: "locked",
    levelCap: 1,
    lastConnectionNote: "Modo local: listo para exportar/importar. La conexion online real necesita un servidor externo."
  };
}

function createServerId() {
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `DMN-${randomPart}`;
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
  base.table = normalizeTable(base.table, base.characters);

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
    character.cobre = Number(character.cobre || 0);
    character.inventory = Array.isArray(character.inventory) ? character.inventory : [];
    character.history = Array.isArray(character.history) ? character.history : [];
    character.states = Array.isArray(character.states) ? character.states : [];
    character.ownerDiscordId = character.ownerDiscordId || "";
    while (character.personalSkills.length < 10) character.personalSkills.push(defaultEffect(character.personalSkills.length, "Habilidad"));
  });

  base.activeId = base.activeId || base.characters[0].id;
  return base;
}

function normalizeTable(table = {}, characters = []) {
  const maxLevel = Math.max(1, ...characters.map((character) => Number(character.level || 1)));
  const normalized = {
    ...defaultTable(),
    ...table
  };
  normalized.serverName = normalized.serverName || "Mesa DAMNATUS";
  normalized.serverId = normalized.serverId || createServerId();
  normalized.joinTarget = normalized.joinTarget || "";
  normalized.view = ["lobby", "game"].includes(normalized.view) ? normalized.view : "lobby";
  normalized.role = ["dm", "player"].includes(normalized.role) ? normalized.role : "dm";
  normalized.onlineStatus = ["local", "online", "offline"].includes(normalized.onlineStatus) ? normalized.onlineStatus : "local";
  normalized.dmConfirmed = Boolean(normalized.dmConfirmed);
  normalized.participants = normalizeParticipants(normalized.participants, characters);
  if (normalized.participants.some((participant) => participant.role === "dm")) {
    normalized.dmConfirmed = true;
  }
  normalized.levelPermission = ["locked", "open"].includes(normalized.levelPermission) ? normalized.levelPermission : "locked";
  normalized.levelCap = Math.max(1, Number(normalized.levelCap || maxLevel));
  normalized.lastConnectionNote = normalized.lastConnectionNote || "Modo local: listo para exportar/importar. La conexion online real necesita un servidor externo.";
  return normalized;
}

function normalizeParticipants(participants = [], characters = []) {
  const characterIds = new Set(characters.map((character) => character.id));
  const clean = Array.isArray(participants) ? participants : [];
  const normalized = clean.map((participant, index) => ({
    id: participant.id || crypto.randomUUID(),
    name: participant.name || `Persona ${index + 1}`,
    role: participant.role === "dm" ? "dm" : "player",
    characterId: characterIds.has(participant.characterId) ? participant.characterId : "",
    active: participant.active !== false,
    confirmed: participant.confirmed !== false
  }));
  const firstDm = normalized.find((participant) => participant.role === "dm");
  normalized.forEach((participant) => {
    if (participant.role === "dm" && participant !== firstDm) participant.role = "player";
  });
  return sortParticipants(normalized);
}

function sortParticipants(participants) {
  return [...participants].sort((a, b) => {
    if (a.role === b.role) return 0;
    return a.role === "dm" ? -1 : 1;
  });
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    alert("No se pudo guardar. La imagen o la campaña ocupan demasiado espacio en este navegador. Prueba con una foto más liviana o exporta la campaña como respaldo.");
    throw error;
  }
  els.saveStatus.textContent = "Guardando...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    els.saveStatus.textContent = "Guardado";
  }, 350);
  scheduleOnlineSave();
}

function hasFirebaseConfig() {
  const config = window.DAMNATUS_FIREBASE_CONFIG || {};
  return Boolean(config.databaseURL && config.projectId);
}

function getRoomKey() {
  const raw = state.table.serverId || state.table.serverName || "damnatus";
  return slugifyRoom(raw);
}

function slugifyRoom(raw) {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "damnatus";
}

async function loadOnlineRoom(rawTarget) {
  if (!onlineSync.enabled || !onlineSync.db) return false;
  const roomKey = slugifyRoom(rawTarget || CAMPAIGN_ID);
  const snapshot = await onlineSync.db.ref(`campaigns/${roomKey}`).once("value");
  const remote = snapshot.val();
  if (!remote?.characters) return false;
  onlineSync.applyingRemote = true;
  onlineSync.campaign = remote;
  state = campaignToState(remote);
  state.table.joinTarget = rawTarget;
  activeId = state.activeId || state.characters[0].id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  onlineSync.applyingRemote = false;
  connectOnlineRoom(true);
  render();
  return true;
}

function initOnlineSync() {
  if (!hasFirebaseConfig()) {
    state.table.onlineStatus = "local";
    state.table.lastConnectionNote = state.table.lastConnectionNote || "Modo local: agrega Firebase para sincronizar online.";
    return;
  }
  if (!window.firebase?.initializeApp || !window.firebase?.database) {
    state.table.onlineStatus = "offline";
    state.table.lastConnectionNote = "Firebase no cargo. Revisa conexion a internet o los scripts de Firebase.";
    return;
  }
  try {
    onlineSync.app = window.firebase.apps?.length
      ? window.firebase.app()
      : window.firebase.initializeApp(window.DAMNATUS_FIREBASE_CONFIG);
    onlineSync.db = window.firebase.database();
    onlineSync.enabled = true;
    connectOnlineRoom();
  } catch (error) {
    onlineSync.enabled = false;
    state.table.onlineStatus = "offline";
    state.table.lastConnectionNote = `No se pudo iniciar Firebase: ${error.message}`;
  }
}

function connectOnlineRoom(force = false) {
  if (!onlineSync.enabled || !onlineSync.db) return;
  const roomKey = CAMPAIGN_ID;
  if (!force && onlineSync.roomRef && onlineSync.roomKey === roomKey) return;

  if (onlineSync.roomRef) onlineSync.roomRef.off();
  onlineSync.roomKey = roomKey;
  onlineSync.roomRef = onlineSync.db.ref(`campaigns/${roomKey}`);
  state.table.onlineStatus = "online";
  state.table.serverId = CAMPAIGN_ID;
  state.table.serverName = "DAMNATUS";
  state.table.lastConnectionNote = `Online: sincronizando campana ${roomKey}.`;

  onlineSync.roomRef.on("value", (snapshot) => {
    const remote = snapshot.val();
    if (!remote?.characters || remote.writeId === onlineSync.lastWriteId) return;
    onlineSync.applyingRemote = true;
    onlineSync.campaign = remote;
    state = campaignToState(remote);
    activeId = state.activeId || state.characters[0].id;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    onlineSync.applyingRemote = false;
    render();
  });

  onlineSync.roomRef.once("value").then((snapshot) => {
    if (!snapshot.exists()) pushOnlineState();
  });
}

function scheduleOnlineSave() {
  if (!onlineSync.enabled || !onlineSync.roomRef || onlineSync.applyingRemote) return;
  clearTimeout(onlineSaveTimer);
  onlineSaveTimer = setTimeout(pushOnlineState, 500);
}

function pushOnlineState() {
  if (!onlineSync.enabled || !onlineSync.roomRef || onlineSync.applyingRemote) return;
  onlineSync.lastWriteId = crypto.randomUUID();
  const patch = stateToCampaignPatch(state, onlineSync.campaign || {});
  onlineSync.roomRef.update({
    ...patch,
    writeId: onlineSync.lastWriteId,
    updatedAt: Date.now()
  }).catch((error) => {
    state.table.onlineStatus = "offline";
    state.table.lastConnectionNote = `No se pudo sincronizar online: ${error.message}`;
    renderTableControls();
    renderLobby();
  });
}

function campaignToState(campaign) {
  const characters = Object.values(campaign.characters || {}).map((character, index) => campaignCharacterToWebCharacter(character, index));
  const table = {
    ...defaultTable(),
    serverName: campaign.meta?.name || "DAMNATUS",
    serverId: CAMPAIGN_ID,
    joinTarget: CAMPAIGN_ID,
    view: state?.table?.view || "game",
    role: state?.table?.role || "dm",
    dmConfirmed: true,
    participants: campaignPlayersToParticipants(campaign.players || {}, campaign.characters || {}),
    onlineStatus: "online",
    levelPermission: campaign.meta?.levelPermission || "locked",
    levelCap: Number(campaign.meta?.levelCap || 1),
    lastConnectionNote: `Online: campana ${CAMPAIGN_ID} sincronizada con Firebase.`
  };
  return normalizeState({
    table,
    activeId: activeId && characters.some((character) => character.id === activeId) ? activeId : characters[0]?.id,
    characters: characters.length ? characters : [defaultCharacter(0)]
  });
}

function campaignCharacterToWebCharacter(character, index) {
  const base = defaultCharacter(index);
  return {
    ...base,
    ...character,
    id: character.id || `char_${character.ownerDiscordId || index}`,
    name: character.name || base.name,
    className: character.className || base.className,
    level: Number(character.level || 1),
    portrait: character.portrait || base.portrait,
    stats: character.stats || base.stats,
    personalSkills: character.personalSkills || base.personalSkills,
    uniqueSkills: character.uniqueSkills || base.uniqueSkills,
    items: character.items || base.items,
    summons: character.summons || [],
    notes: character.notes || "",
    cobre: Number(character.cobre || 0),
    inventory: Array.isArray(character.inventory) ? character.inventory : [],
    history: Array.isArray(character.history) ? character.history : [],
    states: Array.isArray(character.states) ? character.states : []
  };
}

function campaignPlayersToParticipants(players, characters) {
  return Object.values(players).map((player, index) => {
    const character = characters[player.characterId] || {};
    return {
      id: player.discordId || crypto.randomUUID(),
      name: player.displayName || character.name || `Jugador ${index + 1}`,
      role: player.role === "dm" ? "dm" : "player",
      characterId: player.characterId || "",
      active: true,
      confirmed: true
    };
  });
}

function stateToCampaignPatch(nextState, previousCampaign = {}) {
  const now = new Date().toISOString();
  const previousCharacters = previousCampaign.characters || {};
  const previousPlayers = previousCampaign.players || {};
  const characters = {};
  const players = { ...previousPlayers };

  nextState.characters.forEach((character) => {
    const previous = previousCharacters[character.id] || {};
    const ownerDiscordId = character.ownerDiscordId || previous.ownerDiscordId || extractDiscordIdFromCharacterId(character.id);
    characters[character.id] = {
      ...previous,
      ...character,
      ownerDiscordId,
      cobre: Number(character.cobre || previous.cobre || 0),
      inventory: character.inventory || previous.inventory || [],
      history: character.history || previous.history || [],
      states: character.states || previous.states || [],
      updatedAt: now
    };

    if (ownerDiscordId) {
      players[ownerDiscordId] = {
        ...(players[ownerDiscordId] || {}),
        discordId: ownerDiscordId,
        displayName: character.name,
        characterId: character.id,
        role: players[ownerDiscordId]?.role || "player",
        joinedAt: players[ownerDiscordId]?.joinedAt || now
      };
    }
  });

  return {
    meta: {
      ...(previousCampaign.meta || {}),
      name: nextState.table.serverName || "DAMNATUS",
      updatedAt: now,
      dmDiscordId: previousCampaign.meta?.dmDiscordId || "1101193970970800248",
      levelPermission: nextState.table.levelPermission || "locked",
      levelCap: Number(nextState.table.levelCap || 1)
    },
    players,
    characters,
    sessions: previousCampaign.sessions || {
      active: {
        id: "active",
        name: "Sesion actual",
        createdAt: now,
        status: "open",
        currentMapId: "map_main"
      }
    },
    events: previousCampaign.events || {},
    maps: previousCampaign.maps || {
      map_main: {
        id: "map_main",
        name: "Mapa actual",
        gridSize: 24,
        notes: "",
        tokens: {},
        rooms: {}
      }
    }
  };
}

function extractDiscordIdFromCharacterId(characterId) {
  const match = String(characterId || "").match(/^char_(\d+)$/);
  return match ? match[1] : "";
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

function isDm() {
  return state.table.dmConfirmed && state.table.role === "dm";
}

function canEditLevel() {
  return isDm() || state.table.levelPermission === "open";
}

function canEditStats() {
  return isDm() || state.table.levelPermission === "open";
}

function renderTableControls() {
  const table = state.table;
  const character = currentCharacter();
  const dmMode = isDm();
  const levelOpen = table.levelPermission === "open";
  const dmParticipant = table.participants.find((participant) => participant.role === "dm");

  els.serverName.value = table.serverName;
  els.serverId.value = table.serverId;
  els.joinTarget.value = table.joinTarget;
  els.connectionStatus.textContent = table.onlineStatus === "online"
    ? "Online"
    : table.dmConfirmed
      ? "DM confirmado"
      : table.joinTarget
        ? "Vinculo guardado"
        : "Local";
  els.connectionHint.textContent = table.lastConnectionNote;
  renderParticipantCharacterOptions();
  renderActivePeople();
  els.confirmDmBtn.disabled = table.dmConfirmed;
  els.addPlayerBtn.disabled = !table.dmConfirmed;

  els.levelPermission.value = table.levelPermission;
  els.levelPermission.disabled = !dmMode;
  els.globalLevelPermission.value = table.levelPermission;
  els.globalLevelPermission.disabled = !dmMode;
  els.partyLevelCap.value = table.levelCap;
  els.partyLevelCap.disabled = !dmMode;

  els.characterLevel.disabled = !canEditLevel();
  els.levelUpBtn.disabled = !levelOpen && !dmMode;
  els.approveActiveLevelBtn.disabled = !dmMode;
  els.syncPartyLevelBtn.disabled = !dmMode;
  renderDmTargetOptions();
  [
    els.dmTargetCharacter,
    els.dmCopperAmount,
    els.dmRewardItem,
    els.dmStateName,
    els.dmRewardNote,
    els.dmLevelDownBtn,
    els.dmLevelUpBtn,
    els.dmGiveCopperBtn,
    els.dmGiveItemBtn,
    els.dmApplyStateBtn,
    els.dmClearStateBtn
  ].forEach((element) => {
    element.disabled = !dmMode;
  });
  els.dmControlHint.textContent = dmMode
    ? `DM activo: ${dmParticipant?.name || "sin nombre"} controla la mesa. ${character.name} puede llegar hasta nivel ${table.levelCap}.`
    : levelOpen
      ? `Jugador: el DM abrio la subida hasta nivel ${table.levelCap}.`
      : table.dmConfirmed
        ? `Jugador: la subida de nivel esta bloqueada por el DM.`
        : `Primero confirma quien sera el DM de esta mesa.`;
}

function renderDmTargetOptions() {
  const currentValue = els.dmTargetCharacter.value || activeId;
  els.dmTargetCharacter.innerHTML = "";

  state.characters.forEach((character) => {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = `${character.name} - ${character.className} nivel ${character.level}`;
    els.dmTargetCharacter.append(option);
  });

  els.dmTargetCharacter.value = state.characters.some((character) => character.id === currentValue)
    ? currentValue
    : activeId;
}

function renderParticipantCharacterOptions() {
  const currentValue = els.participantCharacter.value;
  els.participantCharacter.innerHTML = "";

  const noCharacter = document.createElement("option");
  noCharacter.value = "";
  noCharacter.textContent = "Detectar por Discord ID";
  els.participantCharacter.append(noCharacter);

  state.characters.forEach((character) => {
    const option = document.createElement("option");
    option.value = character.id;
    const linked = character.ownerDiscordId ? ` - Discord ${character.ownerDiscordId}` : "";
    option.textContent = `${character.name} - ${character.className} nivel ${character.level}${linked}`;
    els.participantCharacter.append(option);
  });

  if ([...els.participantCharacter.options].some((option) => option.value === currentValue)) {
    els.participantCharacter.value = currentValue;
  } else {
    els.participantCharacter.value = "";
  }
}

function renderActivePeople() {
  const participants = sortParticipants(state.table.participants);
  state.table.participants = participants;
  els.activePeopleCount.textContent = participants.length;
  els.activePeopleList.innerHTML = "";

  if (!participants.length) {
    const empty = document.createElement("p");
    empty.className = "table-hint";
    empty.textContent = "Sin DM confirmado. El primero en registrarse debe ser el DM.";
    els.activePeopleList.append(empty);
    return;
  }

  participants.forEach((participant) => {
    const character = state.characters.find((item) => item.id === participant.characterId);
    const row = document.createElement("article");
    row.className = `active-person ${participant.role}`;
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(participant.name)}</strong>
        <span>${participant.role === "dm" ? "DM" : "Jugador"} · ${character ? `${escapeHtml(character.name)} · Nivel ${character.level}` : "Sin personaje"}</span>
      </div>
      <span class="active-dot">${participant.active ? "Activo" : "Ausente"}</span>
    `;
    els.activePeopleList.append(row);
  });
}

function renderLobby() {
  const table = state.table;
  els.lobbyServerName.value = table.serverName;
  els.lobbyServerId.value = table.serverId;
  els.lobbyJoinTarget.value = table.joinTarget;
  renderLobbyCharacterOptions();
  renderLobbyPeople();
  els.lobbyAddPlayerBtn.disabled = !table.dmConfirmed && !hasFirebaseConfig();
  els.enterGameBtn.disabled = !table.dmConfirmed;
  els.lobbyStatus.textContent = table.dmConfirmed
    ? `Mundo "${table.serverName}" listo. PIN: ${table.serverId}. ${getOnlineStatusLabel()}.`
    : `Primero el DM crea el mundo y confirma su rol. ${getOnlineStatusLabel()}.`;
}

function getOnlineStatusLabel() {
  if (state.table.onlineStatus === "online") return "Online activo";
  if (state.table.onlineStatus === "offline") return "Online con error";
  return hasFirebaseConfig() ? "Online pendiente" : "Modo local";
}

function renderLobbyCharacterOptions() {
  const currentValue = els.lobbyPlayerCharacter.value;
  els.lobbyPlayerCharacter.innerHTML = "";
  const noCharacter = document.createElement("option");
  noCharacter.value = "";
  noCharacter.textContent = "Sin personaje";
  els.lobbyPlayerCharacter.append(noCharacter);

  state.characters.forEach((character) => {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = `${character.name} - ${character.className} nivel ${character.level}`;
    els.lobbyPlayerCharacter.append(option);
  });

  if ([...els.lobbyPlayerCharacter.options].some((option) => option.value === currentValue)) {
    els.lobbyPlayerCharacter.value = currentValue;
  } else {
    els.lobbyPlayerCharacter.value = "";
  }
}

function renderLobbyPeople() {
  const participants = sortParticipants(state.table.participants);
  els.lobbyPeopleCount.textContent = participants.length;
  els.lobbyPeopleList.innerHTML = "";

  if (!participants.length) {
    const empty = document.createElement("p");
    empty.className = "table-hint";
    empty.textContent = "Aun no hay personas activas. El primer registro debe ser el DM.";
    els.lobbyPeopleList.append(empty);
    return;
  }

  participants.forEach((participant) => {
    const character = state.characters.find((item) => item.id === participant.characterId);
    const card = document.createElement("article");
    card.className = `lobby-person ${participant.role}`;
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(participant.name)}</strong>
        <span>${participant.role === "dm" ? "DM" : "Jugador"}</span>
      </div>
      <div>
        <strong>${character ? escapeHtml(character.name) : "Sin personaje"}</strong>
        <span>${character ? `Nivel ${character.level}` : "Pendiente"}</span>
      </div>
      <span class="active-dot">${participant.active ? "Activo" : "Ausente"}</span>
    `;
    els.lobbyPeopleList.append(card);
  });
}

function setView(view) {
  state.table.view = view;
  saveState();
  render();
}

function createLobbyFromDm() {
  const dmName = els.lobbyDmName.value.trim();
  const serverName = els.lobbyServerName.value.trim();
  const serverId = els.lobbyServerId.value.trim();
  if (!serverName || !serverId || !dmName) {
    alert("Completa nombre de mundo, PIN y nombre del DM.");
    return;
  }
  state.table.serverName = serverName;
  state.table.serverId = serverId;
  state.table.joinTarget = serverId;
  state.table.participants = [{
    id: crypto.randomUUID(),
    name: dmName,
    role: "dm",
    characterId: "",
    active: true,
    confirmed: true
  }];
  state.table.dmConfirmed = true;
  state.table.role = "dm";
  state.table.lastConnectionNote = `${dmName} organizo el mundo "${serverName}".`;
  connectOnlineRoom(true);
  saveState();
  render();
}

async function addLobbyPlayer() {
  const target = els.lobbyJoinTarget.value.trim();
  const discordId = normalizeDiscordId(els.lobbyPlayerDiscordId.value);
  if (!target || !discordId) {
    alert("Escribe el PIN/nombre de partida y tu ID de Discord.");
    return;
  }
  if (!state.table.dmConfirmed && onlineSync.enabled) {
    const loaded = await loadOnlineRoom(target);
    if (!loaded) {
      alert("No encontre una partida online con ese PIN. Revisa el dato que te dio el DM.");
      return;
    }
  }
  if (!state.table.dmConfirmed) {
    alert("Primero el DM debe crear el mundo.");
    return;
  }
  const validTarget = target === state.table.serverId || target.toLowerCase() === state.table.serverName.toLowerCase();
  if (!validTarget) {
    alert("Ese PIN o nombre de partida no coincide con el mundo creado por el DM.");
    return;
  }
  state.table.joinTarget = target;
  const selectedCharacterId = els.lobbyPlayerCharacter.value;
  let character = selectedCharacterId
    ? state.characters.find((item) => item.id === selectedCharacterId)
    : findCharacterByDiscordId(discordId);
  if (!character) {
    character = defaultCharacter(state.characters.length);
    character.id = `char_${discordId}`;
    character.name = `Discord ${discordId}`;
    character.ownerDiscordId = discordId;
    state.characters.push(character);
  }
  character.ownerDiscordId = discordId;
  state.table.participants = state.table.participants.filter((participant) => {
    return participant.id !== discordId && participant.discordId !== discordId;
  });
  state.table.participants.push({
    id: discordId,
    discordId,
    name: character.name || `Discord ${discordId}`,
    role: "player",
    characterId: character.id,
    active: true,
    confirmed: true
  });
  activeId = character.id;
  state.table.lastConnectionNote = `${character.name} entro al lobby con Discord ID ${discordId}.`;
  els.lobbyPlayerDiscordId.value = "";
  saveState();
  render();
}

function normalizeDiscordId(value) {
  return String(value || "").replace(/\D/g, "");
}

function findCharacterByDiscordId(discordId) {
  return state.characters.find((character) => {
    const ownerDiscordId = normalizeDiscordId(character.ownerDiscordId);
    const idDiscordId = normalizeDiscordId(extractDiscordIdFromCharacterId(character.id));
    return ownerDiscordId === discordId || idDiscordId === discordId;
  });
}

function addParticipant(role) {
  const name = els.participantName.value.trim();
  if (!name) {
    alert("Escribe el nombre de la persona antes de registrarla.");
    return;
  }
  if (role === "dm" && state.table.dmConfirmed) {
    alert("Esta mesa ya tiene DM confirmado.");
    return;
  }
  if (role === "player" && !state.table.dmConfirmed) {
    alert("Primero debe confirmarse el DM.");
    return;
  }

  const participant = {
    id: crypto.randomUUID(),
    name,
    role,
    characterId: els.participantCharacter.value,
    active: true,
    confirmed: true
  };

  if (role === "dm") {
    state.table.participants = [participant, ...state.table.participants.filter((item) => item.role !== "dm")];
    state.table.dmConfirmed = true;
    state.table.role = "dm";
    state.table.lastConnectionNote = `${name} fue confirmado como DM. Ahora pueden registrarse jugadores.`;
  } else {
    state.table.participants.push(participant);
    state.table.lastConnectionNote = `${name} fue registrado como jugador activo.`;
  }

  els.participantName.value = "";
  saveState();
  render();
}

function setLevelPermission(value) {
  state.table.levelPermission = value;
  saveState();
  render();
}

function raiseCharacterLevel(character) {
  const nextLevel = Number(character.level || 1) + 1;
  const cap = Math.max(1, Number(state.table.levelCap || 1));
  if (!isDm() && state.table.levelPermission !== "open") {
    alert("El DM todavia no habilito la subida de nivel.");
    return;
  }
  if (nextLevel > cap) {
    alert(`El limite actual de la mesa es nivel ${cap}.`);
    return;
  }
  character.level = nextLevel;
  saveState();
  render();
}

function renderStats(character) {
  const bonuses = getTotalBonuses(character);
  const statsEditable = canEditStats();
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
    down.disabled = !statsEditable;
    input.disabled = !statsEditable;
    up.disabled = !statsEditable;
    down.addEventListener("click", () => {
      if (!canEditStats()) {
        alert("El DM todavia no habilito cambios de estadisticas.");
        return;
      }
      input.value = Number(input.value || 0) - 1;
      character.stats[stat] = Number(input.value);
      saveState();
      renderStats(character);
    });
    up.addEventListener("click", () => {
      if (!canEditStats()) {
        alert("El DM todavia no habilito cambios de estadisticas.");
        return;
      }
      input.value = Number(input.value || 0) + 1;
      character.stats[stat] = Number(input.value);
      saveState();
      renderStats(character);
    });
    input.addEventListener("input", () => {
      if (!canEditStats()) {
        input.value = character.stats[stat];
        alert("El DM todavia no habilito cambios de estadisticas.");
        return;
      }
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

function renderBotPanel(character) {
  els.botCopper.textContent = Number(character.cobre || 0).toLocaleString("es-AR");
  els.botStatesCount.textContent = Array.isArray(character.states) ? character.states.length : 0;
  renderBotList(
    els.botInventoryList,
    character.inventory || [],
    (item) => `${item.nombre || item.title || item.id || "Objeto"}${item.tipo ? ` (${item.tipo})` : ""}`,
    "Inventario vacio."
  );
  renderBotList(
    els.botHistoryList,
    (character.history || []).slice(-6).reverse(),
    (entry) => `${entry.accion || "Evento"}${Number(entry.precio || 0) ? ` - ${entry.precio} cobre` : ""}`,
    "Sin historial."
  );
}

function renderBotList(container, rows, formatter, emptyText) {
  container.innerHTML = "";
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "bot-empty";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "bot-data-row";
    item.textContent = formatter(row);
    container.append(item);
  });
}

function dmTargetCharacter() {
  const targetId = els.dmTargetCharacter.value || activeId;
  return state.characters.find((character) => character.id === targetId) || currentCharacter();
}

function addDmHistory(character, action, detail = {}) {
  character.history = Array.isArray(character.history) ? character.history : [];
  character.history.push({
    accion: action,
    detalle: detail.note || "",
    precio: detail.copper || 0,
    item: detail.item || "",
    estado: detail.state || "",
    fecha: new Date().toISOString(),
    fuente: "Panel DM"
  });
  character.history = character.history.slice(-40);
}

function applyDmLevel(delta) {
  if (!isDm()) return;
  const character = dmTargetCharacter();
  const cap = Math.max(1, Number(state.table.levelCap || 1));
  const nextLevel = Math.max(1, Math.min(99, Number(character.level || 1) + delta));
  character.level = delta > 0 ? Math.min(nextLevel, cap) : nextLevel;
  addDmHistory(character, delta > 0 ? "Nivel aumentado por DM" : "Nivel reducido por DM", {
    note: els.dmRewardNote.value.trim()
  });
  activeId = character.id;
  saveState();
  render();
}

function giveDmCopper() {
  if (!isDm()) return;
  const amount = Number(els.dmCopperAmount.value || 0);
  if (!amount) return;
  const character = dmTargetCharacter();
  character.cobre = Math.max(0, Number(character.cobre || 0) + amount);
  addDmHistory(character, "Cobre asignado por DM", {
    copper: amount,
    note: els.dmRewardNote.value.trim()
  });
  els.dmCopperAmount.value = "";
  activeId = character.id;
  saveState();
  render();
}

function giveDmItem() {
  if (!isDm()) return;
  const title = els.dmRewardItem.value.trim();
  if (!title) return;
  const character = dmTargetCharacter();
  character.inventory = Array.isArray(character.inventory) ? character.inventory : [];
  character.inventory.push({
    id: crypto.randomUUID(),
    nombre: title,
    tipo: "premio",
    nota: els.dmRewardNote.value.trim(),
    fuente: "Panel DM",
    createdAt: new Date().toISOString()
  });
  addDmHistory(character, "Objeto asignado por DM", {
    item: title,
    note: els.dmRewardNote.value.trim()
  });
  els.dmRewardItem.value = "";
  activeId = character.id;
  saveState();
  render();
}

function applyDmState() {
  if (!isDm()) return;
  const stateName = els.dmStateName.value.trim();
  if (!stateName) return;
  const character = dmTargetCharacter();
  character.states = Array.isArray(character.states) ? character.states : [];
  const exists = character.states.some((stateItem) => {
    const label = stateItem.nombre || stateItem.name || stateItem.id || stateItem;
    return String(label).toLowerCase() === stateName.toLowerCase();
  });
  if (!exists) {
    character.states.push({
      id: crypto.randomUUID(),
      nombre: stateName,
      nota: els.dmRewardNote.value.trim(),
      fuente: "Panel DM",
      createdAt: new Date().toISOString()
    });
  }
  addDmHistory(character, "Estado aplicado por DM", {
    state: stateName,
    note: els.dmRewardNote.value.trim()
  });
  activeId = character.id;
  saveState();
  render();
}

function clearDmState() {
  if (!isDm()) return;
  const stateName = els.dmStateName.value.trim();
  if (!stateName) return;
  const character = dmTargetCharacter();
  character.states = Array.isArray(character.states) ? character.states : [];
  character.states = character.states.filter((stateItem) => {
    const label = stateItem.nombre || stateItem.name || stateItem.id || stateItem;
    return String(label).toLowerCase() !== stateName.toLowerCase();
  });
  addDmHistory(character, "Estado quitado por DM", {
    state: stateName,
    note: els.dmRewardNote.value.trim()
  });
  activeId = character.id;
  saveState();
  render();
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
  document.body.dataset.view = state.table.view;
  els.lobbyView.hidden = state.table.view !== "lobby";
  els.gameView.hidden = state.table.view !== "game";
  renderLobby();

  renderTrackers();
  renderCharacterList();
  els.portraitPreview.src = character.portrait;
  els.characterName.value = character.name;
  els.characterClass.value = character.className;
  els.characterLevel.value = character.level;
  els.difficulty.value = character.difficulty;
  els.campaignNotes.value = character.notes || "";
  renderTableControls();
  renderStats(character);
  renderEffectRows(els.personalSkills, character.personalSkills, "Habilidad");
  renderEffectRows(els.uniqueSkills, character.uniqueSkills, "Habilidad única");
  renderItemRows(character);
  renderSummons(character);
  renderBotPanel(character);
}

function bindInputs() {
  els.generatePinBtn.addEventListener("click", () => {
    els.lobbyServerId.value = createServerId();
  });
  els.createLobbyBtn.addEventListener("click", createLobbyFromDm);
  els.lobbyAddPlayerBtn.addEventListener("click", addLobbyPlayer);
  els.enterGameBtn.addEventListener("click", () => {
    if (!state.table.dmConfirmed) {
      alert("Primero confirma al DM en el lobby.");
      return;
    }
    setView("game");
  });
  els.backToLobbyBtn.addEventListener("click", () => setView("lobby"));
  els.resetLobbyBtn.addEventListener("click", () => {
    if (!confirm("¿Reiniciar solo el lobby? Los personajes y la campaña se conservan.")) return;
    const currentTable = state.table;
    state.table = {
      ...defaultTable(),
      serverName: currentTable.serverName,
      serverId: createServerId(),
      levelPermission: currentTable.levelPermission,
      levelCap: currentTable.levelCap,
      view: "lobby"
    };
    saveState();
    render();
  });
  els.lobbyServerName.addEventListener("input", () => {
    state.table.serverName = els.lobbyServerName.value;
    els.serverName.value = els.lobbyServerName.value;
    saveState();
  });
  els.lobbyServerId.addEventListener("input", () => {
    state.table.serverId = els.lobbyServerId.value;
    els.serverId.value = els.lobbyServerId.value;
    connectOnlineRoom(true);
    saveState();
  });
  els.lobbyJoinTarget.addEventListener("input", () => {
    state.table.joinTarget = els.lobbyJoinTarget.value;
    saveState();
  });
  els.characterName.addEventListener("input", () => {
    currentCharacter().name = els.characterName.value;
    saveState();
    renderCharacterList();
    renderTableControls();
  });
  els.characterClass.addEventListener("change", () => {
    currentCharacter().className = els.characterClass.value;
    saveState();
    renderCharacterList();
    renderTableControls();
  });
  els.characterLevel.addEventListener("input", () => {
    if (!canEditLevel()) {
      els.characterLevel.value = currentCharacter().level;
      alert("El DM todavia no habilito la subida de nivel.");
      return;
    }
    const requestedLevel = Number(els.characterLevel.value || 1);
    const cappedLevel = Math.min(requestedLevel, Math.max(1, Number(state.table.levelCap || 1)));
    currentCharacter().level = cappedLevel;
    els.characterLevel.value = cappedLevel;
    saveState();
    renderCharacterList();
    renderTableControls();
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
    currentCharacter().portrait = await readImageAsCompressedDataUrl(file);
    saveState();
    render();
    event.target.value = "";
  });
  els.serverName.addEventListener("input", () => {
    state.table.serverName = els.serverName.value;
    saveState();
  });
  els.confirmDmBtn.addEventListener("click", () => addParticipant("dm"));
  els.addPlayerBtn.addEventListener("click", () => addParticipant("player"));
  els.levelPermission.addEventListener("change", () => setLevelPermission(els.levelPermission.value));
  els.globalLevelPermission.addEventListener("change", () => setLevelPermission(els.globalLevelPermission.value));
  els.partyLevelCap.addEventListener("input", () => {
    state.table.levelCap = Math.max(1, Number(els.partyLevelCap.value || 1));
    saveState();
    renderTableControls();
  });
  document.querySelector("#copyServerIdBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.table.serverId);
      state.table.lastConnectionNote = "ID copiado. Compartelo con tus jugadores como nombre de mesa.";
    } catch {
      state.table.lastConnectionNote = `Copia manualmente este ID: ${state.table.serverId}`;
    }
    saveState();
    renderTableControls();
  });
  document.querySelector("#joinServerBtn").addEventListener("click", () => {
    state.table.joinTarget = els.joinTarget.value.trim();
    state.table.lastConnectionNote = state.table.joinTarget
      ? `Vinculo guardado hacia ${state.table.joinTarget}. La sincronizacion online se activara cuando exista servidor/P2P.`
      : "Modo local: listo para exportar/importar. La conexion online real necesita un servidor externo.";
    saveState();
    renderTableControls();
  });
  els.levelUpBtn.addEventListener("click", () => raiseCharacterLevel(currentCharacter()));
  els.approveActiveLevelBtn.addEventListener("click", () => {
    const character = currentCharacter();
    state.table.levelCap = Math.max(Number(state.table.levelCap || 1), Number(character.level || 1) + 1);
    raiseCharacterLevel(character);
  });
  els.syncPartyLevelBtn.addEventListener("click", () => {
    if (!isDm()) return;
    const cap = Math.max(1, Number(state.table.levelCap || 1));
    state.characters.forEach((character) => {
      character.level = Math.min(cap, Math.max(Number(character.level || 1), cap));
    });
    saveState();
    render();
  });
  els.dmTargetCharacter.addEventListener("change", () => {
    activeId = els.dmTargetCharacter.value || activeId;
    render();
  });
  els.dmLevelDownBtn.addEventListener("click", () => applyDmLevel(-1));
  els.dmLevelUpBtn.addEventListener("click", () => applyDmLevel(1));
  els.dmGiveCopperBtn.addEventListener("click", giveDmCopper);
  els.dmGiveItemBtn.addEventListener("click", giveDmItem);
  els.dmApplyStateBtn.addEventListener("click", applyDmState);
  els.dmClearStateBtn.addEventListener("click", clearDmState);

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
    state.table.participants.forEach((participant) => {
      if (participant.characterId === character.id) participant.characterId = "";
    });
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

function readImageAsCompressedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(image.src);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = URL.createObjectURL(file);
  });
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
initOnlineSync();
render();
