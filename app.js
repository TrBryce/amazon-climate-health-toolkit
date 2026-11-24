"use strict";

const aliasMap = {
  record_id: ["record_id", "id", "codigo", "code", "participant_id", "patient_id"],
  date: ["date", "fecha", "sample_date", "screening_date"],
  location: ["location", "distrito", "district", "localidad", "community", "comunidad"],
  age: ["age", "edad", "age_years", "edad_anos"],
  sex: ["sex", "sexo", "gender"],
  rainfall_mm: ["rainfall_mm", "lluvia_mm", "precipitation_mm", "precipitacion_mm"],
  flood_level_cm: ["flood_level_cm", "nivel_inundacion_cm", "river_level_cm", "nivel_rio_cm"],
  water_ecoli_cfu: ["water_ecoli_cfu", "ecoli_cfu", "e_coli_ufc", "calidad_agua_ecoli"],
  parasite_positive: ["parasite_positive", "parasitosis", "parasite_result", "resultado_parasitos"],
  parasite_species: ["parasite_species", "especie_parasito", "taxon", "parasite_taxon"],
  malaria_positive: ["malaria_positive", "malaria", "malaria_result", "resultado_malaria"],
  plasmodium_species: ["plasmodium_species", "especie_plasmodium", "plasmodium"],
  hemoglobin_g_dl: ["hemoglobin_g_dl", "hemoglobina", "hb", "hb_g_dl"],
  anemia: ["anemia", "anemia_status", "estado_anemia"],
  wash_access: ["wash_access", "acceso_wash", "safe_water_access", "agua_segura"]
};

const preferredColumns = [
  "record_id", "date", "location", "hydrological_season", "age", "sex",
  "rainfall_mm", "flood_level_cm", "water_ecoli_cfu", "wash_access",
  "parasite_positive", "parasite_species", "malaria_positive",
  "plasmodium_species", "hemoglobin_g_dl", "anemia"
];

const demoCsv = `record_id,date,location,age,sex,rainfall_mm,flood_level_cm,water_ecoli_cfu,wash_access,parasite_positive,parasite_species,malaria_positive,plasmodium_species,hemoglobin_g_dl,anemia
AMZ001,2026-01-15,Belen,8,F,312,168,190,no,yes,Blastocystis sp.,no,,10.4,yes
AMZ002,2026-01-19,Belen,11,M,298,174,120,no,yes,Giardia duodenalis,no,,11.8,no
AMZ003,2026-02-05,San Juan,7,F,340,182,85,yes,no,,yes,Plasmodium vivax,10.7,yes
AMZ004,2026-02-20,Punchana,13,M,355,190,210,no,yes,Endolimax nana,no,,12.6,no
AMZ005,2026-03-12,Belen,9,F,326,201,155,no,yes,Trichuris trichiura,no,,10.9,yes
AMZ006,2026-04-08,San Juan,12,M,280,188,42,yes,no,,no,,12.9,no
AMZ007,2026-05-17,Punchana,10,F,245,171,96,yes,yes,Blastocystis sp.,yes,Plasmodium vivax,11.1,no
AMZ008,2026-06-09,Belen,8,M,182,135,70,yes,no,,no,,11.6,no
AMZ009,2026-07-14,San Juan,14,F,124,103,38,yes,no,,no,,12.4,no
AMZ010,2026-08-02,Punchana,6,M,96,82,115,no,yes,Giardia duodenalis,no,,10.3,yes
AMZ011,2026-09-21,Belen,11,F,88,70,65,yes,no,,yes,Plasmodium falciparum,11.4,no
AMZ012,2026-10-11,San Juan,9,M,110,77,52,yes,no,,no,,12.1,no
AMZ013,2026-11-05,Punchana,12,F,156,99,140,no,yes,Blastocystis sp.|Endolimax nana,no,,11.0,yes
AMZ014,2026-12-13,Belen,7,M,270,145,180,no,yes,Ascaris lumbricoides,no,,10.5,yes
AMZ015,2026-04-25,Punchana,15,F,290,180,48,yes,no,,no,,12.7,no
AMZ016,2026-07-30,Belen,10,M,130,91,88,yes,yes,Blastocystis sp.,no,,11.3,no`;

let harmonizedData = [];
let detectedColumns = [];

const els = {
  file: document.querySelector("#csvFile"),
  dropzone: document.querySelector("#dropzone"),
  demo: document.querySelector("#demoButton"),
  heroDemo: document.querySelector("#heroDemo"),
  status: document.querySelector("#status"),
  export: document.querySelector("#exportButton"),
  location: document.querySelector("#locationFilter"),
  season: document.querySelector("#seasonFilter"),
  metrics: document.querySelector("#metrics"),
  chart: document.querySelector("#chart"),
  quality: document.querySelector("#quality"),
  variables: document.querySelector("#variables"),
  head: document.querySelector("#tableHead"),
  body: document.querySelector("#tableBody")
};

function normalizeName(value) {
  return String(value || "")
    .trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(field); field = "";
      if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV must contain a header and at least one data row.");
  const headers = rows[0].map(normalizeName);
  return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()])));
}

function findSourceColumn(headers, target) {
  const aliases = aliasMap[target] || [target];
  return aliases.map(normalizeName).find(alias => headers.includes(alias));
}

function normalizeBinary(value) {
  const v = normalizeName(value);
  if (["yes", "si", "positive", "positivo", "1", "true", "present", "presente"].includes(v)) return "yes";
  if (["no", "negative", "negativo", "0", "false", "absent", "ausente"].includes(v)) return "no";
  return "";
}

function normalizeSex(value) {
  const v = normalizeName(value);
  if (["f", "female", "femenino", "mujer"].includes(v)) return "F";
  if (["m", "male", "masculino", "hombre"].includes(v)) return "M";
  return value ? String(value).trim() : "";
}

function parseDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) return `${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}`;
  match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function seasonFromDate(date) {
  if (!date) return "Unknown";
  const month = Number(date.slice(5, 7));
  return (month >= 12 || month <= 5) ? "Rising-water" : "Falling-water";
}

function cleanNumeric(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? String(number) : "";
}

function harmonize(rows) {
  const headers = Object.keys(rows[0] || {});
  const source = {};
  Object.keys(aliasMap).forEach(target => { source[target] = findSourceColumn(headers, target); });
  detectedColumns = Object.entries(source).filter(([, value]) => value).map(([key]) => key);
  if (!source.date && !source.location && !source.parasite_positive && !source.malaria_positive && !source.anemia) {
    throw new Error("No recognized date, location or health outcome columns were found. Check the README schema.");
  }
  return rows.map((row, index) => {
    const get = target => source[target] ? row[source[target]] : "";
    const date = parseDate(get("date"));
    return {
      record_id: get("record_id") || `REC${String(index + 1).padStart(4, "0")}`,
      date,
      location: get("location") || "Unknown",
      hydrological_season: seasonFromDate(date),
      age: cleanNumeric(get("age")),
      sex: normalizeSex(get("sex")),
      rainfall_mm: cleanNumeric(get("rainfall_mm")),
      flood_level_cm: cleanNumeric(get("flood_level_cm")),
      water_ecoli_cfu: cleanNumeric(get("water_ecoli_cfu")),
      wash_access: normalizeBinary(get("wash_access")),
      parasite_positive: normalizeBinary(get("parasite_positive")),
      parasite_species: get("parasite_species"),
      malaria_positive: normalizeBinary(get("malaria_positive")),
      plasmodium_species: get("plasmodium_species"),
      hemoglobin_g_dl: cleanNumeric(get("hemoglobin_g_dl")),
      anemia: normalizeBinary(get("anemia"))
    };
  });
}

function percentage(rows, key) {
  const reported = rows.filter(row => row[key] === "yes" || row[key] === "no");
  if (!reported.length) return { label: "—", reported: 0 };
  const positive = reported.filter(row => row[key] === "yes").length;
  return { label: `${(100 * positive / reported.length).toFixed(1)}%`, reported: reported.length };
}

function filteredRows() {
  return harmonizedData.filter(row =>
    (els.location.value === "all" || row.location === els.location.value) &&
    (els.season.value === "all" || row.hydrological_season === els.season.value)
  );
}

function renderMetrics(rows) {
  const parasite = percentage(rows, "parasite_positive");
  const malaria = percentage(rows, "malaria_positive");
  const anemia = percentage(rows, "anemia");
  const values = [
    [String(rows.length), "valid rows"],
    [parasite.label, `${parasite.reported} reported`],
    [malaria.label, `${malaria.reported} reported`],
    [anemia.label, `${anemia.reported} reported`]
  ];
  [...els.metrics.querySelectorAll("article")].forEach((article, i) => {
    article.querySelector("strong").textContent = values[i][0];
    article.querySelector("small").textContent = values[i][1];
  });
}

function renderChart(rows) {
  const groups = ["Rising-water", "Falling-water"];
  const outcomes = [
    ["Parasite", "parasite_positive"],
    ["Malaria", "malaria_positive"],
    ["Anemia", "anemia"]
  ];
  const items = [];
  groups.forEach(season => {
    const seasonRows = rows.filter(row => row.hydrological_season === season);
    outcomes.forEach(([label, key]) => {
      const result = percentage(seasonRows, key);
      if (result.reported) items.push({ label: `${season} · ${label}`, value: Number(result.label.replace("%", "")), display: result.label });
    });
  });
  if (!items.length) {
    els.chart.className = "chart-empty";
    els.chart.textContent = "No reported binary outcomes are available for this selection.";
    return;
  }
  els.chart.className = "chart";
  els.chart.innerHTML = items.map(item => `
    <div class="chart-row">
      <span>${escapeHtml(item.label)}</span>
      <div class="bar-track"><div class="bar" style="width:${Math.max(0, Math.min(100, item.value))}%"></div></div>
      <span class="bar-value">${item.display}</span>
    </div>`).join("");
}

function renderQuality(rows) {
  const checks = [
    ["Missing dates", rows.filter(r => !r.date).length],
    ["Unknown locations", rows.filter(r => r.location === "Unknown").length],
    ["Missing hydrological season", rows.filter(r => r.hydrological_season === "Unknown").length],
    ["Duplicate record IDs", rows.length - new Set(rows.map(r => r.record_id)).size]
  ];
  els.quality.innerHTML = checks.map(([label, value]) => `<div class="quality-line"><span>${label}</span><strong>${value}</strong></div>`).join("");
  els.variables.innerHTML = detectedColumns.length ? detectedColumns.map(v => `<span>${escapeHtml(v)}</span>`).join("") : "<span>None</span>";
}

function renderTable(rows) {
  const visible = preferredColumns.filter(column => rows.some(row => row[column] !== "" && row[column] !== undefined));
  if (!rows.length) {
    els.head.innerHTML = "";
    els.body.innerHTML = '<tr><td class="empty-cell">No records match the current filters.</td></tr>';
    return;
  }
  els.head.innerHTML = `<tr>${visible.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr>`;
  els.body.innerHTML = rows.slice(0, 50).map(row => `<tr>${visible.map(column => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("");
}

function updateView() {
  const rows = filteredRows();
  renderMetrics(rows);
  renderChart(rows);
  renderQuality(harmonizedData);
  renderTable(rows);
}

function populateFilters() {
  const locations = [...new Set(harmonizedData.map(row => row.location))].sort();
  els.location.innerHTML = '<option value="all">All locations</option>' + locations.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  els.location.disabled = false;
  els.season.disabled = false;
  els.export.disabled = false;
}

function loadText(text, label) {
  try {
    const rows = parseCsv(text.replace(/^\uFEFF/, ""));
    harmonizedData = harmonize(rows);
    populateFilters();
    updateView();
    setStatus(`${label}: ${harmonizedData.length} records harmonized successfully.`, "ok");
  } catch (error) {
    harmonizedData = [];
    setStatus(error.message || "The dataset could not be processed.", "error");
  }
}

function setStatus(message, type = "") {
  els.status.textContent = message;
  els.status.className = `status ${type}`.trim();
}

function toCsv(rows) {
  const quote = value => {
    const string = String(value ?? "");
    return /[",\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
  };
  return [preferredColumns.join(","), ...rows.map(row => preferredColumns.map(key => quote(row[key])).join(","))].join("\n");
}

function exportCsv() {
  const rows = filteredRows();
  if (!rows.length) return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "harmonized_climate_health_data.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

els.file.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadText(reader.result, file.name);
  reader.onerror = () => setStatus("The selected file could not be read.", "error");
  reader.readAsText(file);
});

["dragenter", "dragover"].forEach(type => els.dropzone.addEventListener(type, event => { event.preventDefault(); els.dropzone.classList.add("drag"); }));
["dragleave", "drop"].forEach(type => els.dropzone.addEventListener(type, event => { event.preventDefault(); els.dropzone.classList.remove("drag"); }));
els.dropzone.addEventListener("drop", event => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadText(reader.result, file.name);
  reader.readAsText(file);
});

els.demo.addEventListener("click", () => loadText(demoCsv, "Synthetic demo"));
els.heroDemo.addEventListener("click", () => {
  loadText(demoCsv, "Synthetic demo");
  document.querySelector("#tool").scrollIntoView({ behavior: "smooth" });
});
els.location.addEventListener("change", updateView);
els.season.addEventListener("change", updateView);
els.export.addEventListener("click", exportCsv);
