"use strict";

// Version 1.1: the evidence registry is the single source of truth for the board and counter.
const EVIDENCE = {
  "case-condition": { category: "Physical evidence", title: "Locked Display Case", text: "The case is locked and undamaged. Whoever opened it used an authorised key." },
  "security-log": { category: "Security record", title: "Case Access Log", text: "The case was opened twice: 8:43 PM and 9:12 PM. The stopped hall clock at 9:17 PM is unrelated." },
  "key-log": { category: "Security record", title: "Canon's Key Removal", text: "Canon removed the security override key at 9:05 PM and returned it after the second opening." },
  "cctv-agatha": { category: "CCTV", title: "Agatha with Transport Case", text: "At 8:43 PM, Agatha was seen near the office carrying a small transport case." },
  "cctv-canon": { category: "CCTV", title: "Canon Near the Case", text: "At 9:12 PM, Canon is on the office camera near the display case." },
  "museum-serial": { category: "Museum record", title: "Catalogue Serial: NE-1927-B", text: "The museum catalogue and archival photograph identify the genuine Night Express Clock as NE-1927-B." },
  "stopped-clock": { category: "Red herring", title: "Hall Clock Stopped at 9:17", text: "The hall clock stopped when Canon moved a trolley. It does not record either case opening." },
  "emily-alibi": { category: "Statement", title: "Emily's Restoration Log", text: "Emily was documenting restoration work in the exhibition hall during both recorded case openings." },
  "canon-admission": { category: "Admission", title: "Canon Admits Theft", text: "Canon admits opening the case at 9:12 PM and stealing the clock" },
  "recovered-clock": { category: "Recovered object", title: "Canon's Recovered Clock", text: "Canon hid the clock inside the old luggage trolley in the staff corridor." },
  "replica-serial": { category: "Physical evidence", title: "Recovered Serial: NE-1927-A", text: "The clock Canon stole bears serial number NE-1927-A." },
  "locker-trace": { category: "Physical evidence", title: "Disturbed Luggage Locker", text: "The stationmaster's locker has fresh scratches and a strip of velvet matching the display case lining." },
  "genuine-clock": { category: "Recovered object", title: "Genuine Clock: NE-1927-B", text: "The genuine Night Express Clock was hidden in the luggage locker. Its serial matches the museum record." },
  "collector-letter": { category: "Motive", title: "Arthur Bell Correspondence", text: "Agatha arranged a private sale of the authentic clock to collector Arthur Bell for £50,000." }
};

const locations = {
  office: { name: "Stationmaster's Office", scene: "The display case is empty. Rain rattles the station windows while the museum's staff wait for your conclusion." },
  exhibition: { name: "Exhibition Hall", scene: "Railway memorabilia rests beneath low lamps. The records here can establish what the genuine clock should be." },
  corridor: { name: "Staff Corridor", scene: "A narrow service passage holds an old luggage trolley and the stationmaster's luggage locker." }
};

const gameState = {
  location: "office", evidence: new Set(), interviews: { agatha: 0, canon: 0, emily: 0 },
  canonIdentified: false, canonAdmits: false, canonClockRecovered: false, serialInspected: false,
  revealedReplica: false, genuineClockFound: false, collectorFound: false, score: 0
};

const $ = (id) => document.getElementById(id);
const modal = $("modal");
const objectList = $("object-list");
const characterList = $("character-list");

function addEvidence(id) {
  if (!gameState.evidence.has(id)) gameState.evidence.add(id);
  renderEvidence();
  updateProgression();
}

function has(...ids) { return ids.every((id) => gameState.evidence.has(id)); }

function updateProgression() {
  if (!gameState.canonIdentified && has("key-log", "cctv-canon", "security-log")) gameState.canonIdentified = true;
  renderAll();
}

function revealReplica() {
  if (!gameState.serialInspected || !has("museum-serial") || gameState.revealedReplica) return;
  gameState.revealedReplica = true;
  renderAll();
  showModal("Critical revelation", "This Isn't the Night Express Clock", `<div class="revelation">NE-1927-A is not NE-1927-B.<br><strong>Canon stole a replica.</strong></div><p>The 8:43 opening now matters: someone replaced the genuine clock before Canon's theft at 9:12 PM.</p>`);
}

function getObjects() {
  const base = {
    office: [
      ["display-case", "Display Case", "The empty, locked case"],
      ["security-panel", "Security Panel", "Authorised access records"],
      ["cctv", "CCTV Monitor", "Review the office camera"],
      ["agatha-desk", "Agatha's Desk", "Personal effects and correspondence"]
    ],
    exhibition: [
      ["catalogue", "Museum Catalogue", "The official object register"],
      ["archival-photo", "Archival Photograph", "A 1927 restoration image"],
      ["hall-clock", "Stopped Hall Clock", "Frozen at 9:17 PM"],
      ["restoration-log", "Restoration Log", "Emily's work record"]
    ],
    corridor: [
      ["key-log", "Key Cabinet Log", "Who accessed the override key"],
      ["luggage-trolley", "Old Luggage Trolley", gameState.canonAdmits ? "Canon named this hiding place" : "Dusty, unused museum trolley"],
      ["luggage-locker", "Stationmaster's Luggage Locker", gameState.revealedReplica ? "A new lead: search for the original" : "Locked and apparently unrelated"]
    ]
  };
  if (gameState.genuineClockFound) base.office.push(["collector-letter", "Arthur Bell Correspondence", "A document now relevant to motive"]);
  return base[gameState.location];
}

function examineObject(id) {
  const actions = {
    "display-case": () => clue("case-condition", "The lock is intact. The case was opened carefully, not forced."),
    "security-panel": () => clue("security-log", "The log is clear: two authorised openings, at 8:43 PM and 9:12 PM."),
    cctv: () => { addEvidence("cctv-agatha"); addEvidence("cctv-canon"); showModal("CCTV", "Two Separate Visits", `<p class="clue-text">8:43 PM — Agatha crosses the office with a small transport case.\n\n9:12 PM — Canon approaches the display case alone.</p>`); },
    "agatha-desk": () => showModal("Investigation", "Agatha's Desk", gameState.genuineClockFound ? "A labelled folder catches your eye: correspondence with Arthur Bell." : "Nothing here establishes why the clock was stolen."),
    catalogue: () => clue("museum-serial", "The catalogue identifies the genuine clock as NE-1927-B."),
    "archival-photo": () => clue("museum-serial", "The enlarged photograph confirms the catalogue entry: the original's serial was NE-1927-B."),
    "hall-clock": () => clue("stopped-clock", "The 9:17 stop is a red herring: Canon knocked it while moving the trolley."),
    "restoration-log": () => clue("emily-alibi", "Emily's timed restoration notes account for her during both access-log entries."),
    "key-log": () => clue("key-log", "Canon signed out the override key at 9:05 PM."),
    "luggage-trolley": inspectRecoveredClock,
    "luggage-locker": inspectLocker,
    "collector-letter": () => { if (gameState.genuineClockFound) { gameState.collectorFound = true; clue("collector-letter", "Arthur Bell's letter promises £50,000 for the authentic Night Express Clock, delivered privately."); } },
  };
  actions[id]();
}

function clue(id, intro) {
  addEvidence(id);
  const canCompare = id === "museum-serial" && gameState.serialInspected && !gameState.revealedReplica;
  showModal(EVIDENCE[id].category, EVIDENCE[id].title, `<p class="clue-text">${intro}</p>${canCompare ? "<p>The recovered clock's serial can now be compared with this record.</p>" : ""}`, canCompare ? [{ label: "Compare serial numbers", action: revealReplica }] : []);
}

function inspectRecoveredClock() {
  if (!gameState.canonAdmits) return showModal("Investigation", "Old Luggage Trolley", "Only dust and discarded tags. Canon has not told you where he hid the stolen clock.");
  if (!gameState.canonClockRecovered) { gameState.canonClockRecovered = true; addEvidence("recovered-clock"); showModal("Recovered object", "Canon's Stolen Clock", `<p>You find a brass clock wrapped in cloth beneath the trolley compartment.</p><div class="warning">Canon's stolen clock has been recovered. Examine its mechanism.</div>`, [{ label: "Examine the mechanism", action: inspectSerial }]); return; }
  if (!gameState.serialInspected) return showModal("Recovered object", "Canon's Stolen Clock", "The recovered clock is ready to examine.", [{ label: "Examine the mechanism", action: inspectSerial }]);
  showModal("Recovered object", "Canon's Stolen Clock", "The mechanism bears serial number NE-1927-A.");
}

function inspectSerial() {
  addEvidence("replica-serial");
  gameState.serialInspected = true;
  const compared = has("museum-serial");
  showModal("Physical evidence", "Serial Number: NE-1927-A", `<p>The stamped number on Canon's recovered clock is <strong>NE-1927-A</strong>.</p>${compared ? "<p>The museum record is already in the case file. Compare the two serial numbers.</p>" : "<p>Find the museum record to determine whether this is the genuine clock.</p>"}`, compared ? [{ label: "Compare with museum record", action: revealReplica }] : []);
}

function inspectLocker() {
  if (!gameState.revealedReplica) return showModal("Investigation", "Stationmaster's Luggage Locker", "There is no reason yet to connect this old locker to the theft. First establish what Canon actually stole.");
  addEvidence("locker-trace");
  if (!gameState.genuineClockFound) { gameState.genuineClockFound = true; addEvidence("genuine-clock"); showModal("Recovered object", "The Genuine Night Express Clock", `<p>Inside, beneath disturbed velvet, is the genuine clock.</p><div class="revelation">Serial number: NE-1927-B</div><p>The original was hidden here before Canon stole the replica.</p>`); }
}

const dialogue = {
  agatha: ["I locked the display case myself. The clock was definitely there.", "The 9:12 opening? I cannot explain it. I reported the theft once I found the case empty.", "I had no reason to remove the clock."],
  canon: ["I was making my rounds. I did not steal anything.", "My debts are private. They have nothing to do with this museum."],
  emily: ["I was recording restoration work in the exhibition hall.", "My fingerprints belong on museum equipment. I am the conservator.", "The restoration log will show exactly where I was."]
};

function interview(id) {
  if (id === "canon" && gameState.canonIdentified && !gameState.canonAdmits) {
    gameState.canonAdmits = true; addEvidence("canon-admission");
    return showModal("Admission", "Canon Breaks", `<p>"Yes. I took it at 9:12. I thought it was the genuine Night Express Clock. I hid it in the old luggage trolley until I could get it out."</p><div class="warning">New lead: recover Canon's stolen clock from the staff corridor.</div>`);
  }
  const index = Math.min(gameState.interviews[id], dialogue[id].length - 1);
  gameState.interviews[id] += 1;
  let text = dialogue[id][index];
  if (id === "canon" && !gameState.canonIdentified && gameState.interviews[id] >= 2) text += "\n\nYou need the access log and CCTV before you can confront him.";
  showModal("Interview", id[0].toUpperCase() + id.slice(1), `<p class="clue-text">“${text}”</p>`);
}

function leadText() {
  if (!gameState.canonIdentified) return "Find out how the locked display case was opened.";
  if (!gameState.canonAdmits) return "Confront Canon with the security log, CCTV, and key record.";
  if (!gameState.canonClockRecovered) return "Recover Canon's stolen clock from the old luggage trolley.";
  if (!gameState.serialInspected) return "Examine the recovered clock's mechanism.";
  if (!gameState.revealedReplica) return "Compare the recovered serial with the museum's catalogue record.";
  if (!gameState.genuineClockFound) return "New lead: find the genuine Night Express Clock.";
  if (!gameState.collectorFound) return "New lead: find out why the original was removed.";
  return "The physical chain and motive are complete. Reconstruct both crimes in the case file.";
}

function renderAll() { renderLocation(); renderObjects(); renderCharacters(); renderEvidence(); $("lead-text").textContent = leadText(); }
function renderLocation() {
  $("location-title").textContent = locations[gameState.location].name;
  $("scene-description").textContent = locations[gameState.location].scene;
  $("location-list").innerHTML = Object.entries(locations).map(([id, l]) => `<button class="location-button ${id === gameState.location ? "active" : ""}" data-location="${id}">${l.name}</button>`).join("");
  document.querySelectorAll("[data-location]").forEach((button) => button.addEventListener("click", () => { gameState.location = button.dataset.location; renderAll(); }));
}
function renderObjects() { objectList.innerHTML = getObjects().map(([id, title, detail]) => `<button class="card object-card ${objectDone(id) ? "done" : ""}" data-object="${id}"><strong>${title}</strong><span>${detail}</span></button>`).join(""); document.querySelectorAll("[data-object]").forEach((button) => button.addEventListener("click", () => examineObject(button.dataset.object))); }
function objectDone(id) { const map = {"display-case":"case-condition","security-panel":"security-log",cctv:"cctv-canon",catalogue:"museum-serial","archival-photo":"museum-serial","hall-clock":"stopped-clock","restoration-log":"emily-alibi","key-log":"key-log","luggage-trolley":"recovered-clock","luggage-locker":"genuine-clock","collector-letter":"collector-letter"}; return Boolean(map[id] && gameState.evidence.has(map[id])); }
function renderCharacters() { const people = [["agatha","Agatha","Museum curator"],["canon","Canon","Night guard"],["emily","Emily","Conservator"]]; characterList.innerHTML = people.map(([id,n,r]) => `<button class="card interview-card" data-person="${id}"><strong>${n}</strong><span>${r}</span></button>`).join(""); document.querySelectorAll("[data-person]").forEach((button) => button.addEventListener("click", () => interview(button.dataset.person))); }
function renderEvidence() { $("evidence-count").textContent = `${gameState.evidence.size} / ${Object.keys(EVIDENCE).length}`; $("evidence-board").innerHTML = gameState.evidence.size ? [...gameState.evidence].map((id) => `<button class="evidence-item" data-evidence="${id}"><small>${EVIDENCE[id].category}</small>${EVIDENCE[id].title}</button>`).join("") : "<p class='lead-text'>No evidence collected.</p>"; document.querySelectorAll("[data-evidence]").forEach((button) => button.addEventListener("click", () => { const e = EVIDENCE[button.dataset.evidence]; showModal(e.category, e.title, `<p class="clue-text">${e.text}</p>`); })); }

function showModal(category, title, content, actions = []) { $("modal-category").textContent = category; $("modal-title").textContent = title; $("modal-content").innerHTML = content; $("modal-actions").innerHTML = actions.length ? `<div class="action-row">${actions.map((a, i) => `<button class="primary-btn" data-action="${i}">${a.label}</button>`).join("")}</div>` : ""; actions.forEach((a, i) => { const button = document.querySelector(`[data-action="${i}"]`); if (button) button.addEventListener("click", a.action); }); modal.classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

function openCaseFile() { const ready = gameState.collectorFound && gameState.genuineClockFound; $("case-file-content").innerHTML = `<div class="case-status"><strong>Current lead:</strong> ${leadText()}</div><p><strong>Known timeline:</strong><br>8:43 PM — a first authorised opening.<br>9:12 PM — a second authorised opening.</p>${ready ? `<button id="open-accusation" class="primary-btn">Make Final Accusation</button>` : "<p>Complete the evidence chain before presenting a final reconstruction.</p>"}`; $("case-file-modal").classList.remove("hidden"); const button = $("open-accusation"); if (button) button.addEventListener("click", () => { closeModal("case-file-modal"); $("accusation-modal").classList.remove("hidden"); }); }

function submitAccusation(event) { event.preventDefault(); const answers = {"crime1-person": "agatha", "crime1-object": "original", "crime1-time": "843", "crime2-person": "canon", "crime2-object": "replica", "crime2-time": "912", motive: "sale", "hiding-place": "locker"}; let score = 0; Object.entries(answers).forEach(([id, answer]) => { if ($(id).value === answer) score += ["crime1-person","crime2-person"].includes(id) ? 20 : ["crime1-object","crime2-object"].includes(id) ? 15 : ["crime1-time","crime2-time"].includes(id) ? 10 : 5; }); gameState.score = score; $("score").textContent = score; closeModal("accusation-modal"); const perfect = score === 100; showModal("Case closed", perfect ? "Master Detective" : score >= 65 ? "The Truth, Mostly" : "Case Unsolved", `<div class="ending"><p><strong>Score: ${score}/100</strong></p><p>${perfect ? "At 8:43, Agatha removed the genuine NE-1927-B clock, placed a replica in the case, and hid the original for sale to Arthur Bell. At 9:12, Canon independently stole that replica, believing it genuine. Neither crime explains the other — Canon's theft exposed Agatha's earlier one." : "The evidence establishes two separate crimes: Agatha removed the genuine clock at 8:43 for a private sale, and Canon stole the replica at 9:12. Review the case file and try again if your reconstruction missed part of that chain."}</p></div>`); }

$("case-file-btn").addEventListener("click", openCaseFile);
$("accusation-form").addEventListener("submit", submitAccusation);
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
renderAll();
