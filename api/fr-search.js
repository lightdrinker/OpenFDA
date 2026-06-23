const BDPM_BASE_URL = "https://base-donnees-publique.medicaments.gouv.fr/download/file";
const CACHE_MS = 6 * 60 * 60 * 1000;

const FILES = {
  products: "CIS_bdpm.txt",
  components: "CIS_COMPO_bdpm.txt",
  presentations: "CIS_CIP_bdpm.txt",
  conditions: "CIS_CPD_bdpm.txt",
  mitm: "CIS_MITM.txt"
};

let cachedPayload = null;
let cachedAt = 0;

function toText(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(" ");
  return String(value);
}

function normalize(value) {
  return toText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.split("\t"));
}

async function fetchBdpmText(file) {
  const response = await fetch(`${BDPM_BASE_URL}/${file}`);
  if (!response.ok) throw new Error(`${file} returned HTTP ${response.status}`);
  return new TextDecoder("windows-1252").decode(await response.arrayBuffer());
}

function addGrouped(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function unique(values) {
  const seen = new Set();
  const output = [];

  values.flat().forEach((value) => {
    const text = toText(value).trim();
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      output.push(text);
    }
  });

  return output;
}

function parseProducts(rows) {
  return rows.map((row) => ({
    cis: row[0] || "",
    name: row[1] || "",
    form: row[2] || "",
    route: row[3] || "",
    authorisationStatus: row[4] || "",
    procedure: row[5] || "",
    commercialStatus: row[6] || "",
    authorisationDate: row[7] || "",
    bdmStatus: row[8] || "",
    europeanNumber: row[9] || "",
    holder: row[10] || "",
    enhancedSurveillance: row[11] || ""
  }));
}

function parseComponents(rows) {
  const map = new Map();
  rows.forEach((row) => {
    addGrouped(map, row[0], {
      form: row[1] || "",
      substanceCode: row[2] || "",
      name: row[3] || "",
      strength: row[4] || "",
      strengthReference: row[5] || "",
      nature: row[6] || ""
    });
  });
  return map;
}

function parsePresentations(rows) {
  const map = new Map();
  rows.forEach((row) => {
    addGrouped(map, row[0], {
      cip7: row[1] || "",
      label: row[2] || "",
      status: row[3] || "",
      commercialStatus: row[4] || "",
      declarationDate: row[5] || "",
      cip13: row[6] || "",
      collectiveAgreement: row[7] || "",
      reimbursementRate: row[8] || "",
      price: row[9] || "",
      priceWithFee: row[10] || "",
      fee: row[11] || "",
      reimbursementInfo: row[12] || ""
    });
  });
  return map;
}

function parseConditions(rows) {
  const map = new Map();
  rows.forEach((row) => addGrouped(map, row[0], row[1] || ""));
  return map;
}

function parseMitm(rows) {
  const map = new Map();
  rows.forEach((row) => {
    map.set(row[0], {
      atc: row[1] || "",
      name: row[2] || "",
      url: row[3] || ""
    });
  });
  return map;
}

async function loadFranceData() {
  if (cachedPayload && Date.now() - cachedAt < CACHE_MS) return cachedPayload;

  const [productsText, componentsText, presentationsText, conditionsText, mitmText] = await Promise.all([
    fetchBdpmText(FILES.products),
    fetchBdpmText(FILES.components),
    fetchBdpmText(FILES.presentations),
    fetchBdpmText(FILES.conditions),
    fetchBdpmText(FILES.mitm)
  ]);

  const components = parseComponents(splitRows(componentsText));
  const presentations = parsePresentations(splitRows(presentationsText));
  const conditions = parseConditions(splitRows(conditionsText));
  const mitm = parseMitm(splitRows(mitmText));

  const records = parseProducts(splitRows(productsText)).map((product) => ({
    ...product,
    components: components.get(product.cis) || [],
    presentations: presentations.get(product.cis) || [],
    conditions: conditions.get(product.cis) || [],
    mitm: mitm.get(product.cis) || null
  }));

  cachedPayload = {
    loadedAt: new Date().toISOString(),
    records
  };
  cachedAt = Date.now();
  return cachedPayload;
}

function queryTokens(query) {
  return normalize(query).split(" ").filter((token) => token.length > 1);
}

function scoreText(text, query, exact, prefix, includes, tokenScore = 0) {
  const normalizedText = normalize(text);
  if (!normalizedText) return 0;

  let score = 0;
  if (normalizedText === query.normalized) score += exact;
  if (normalizedText.startsWith(query.normalized)) score += prefix;
  if (normalizedText.includes(query.normalized)) score += includes;

  query.tokens.forEach((token) => {
    if (normalizedText.includes(token)) score += tokenScore;
  });

  return score;
}

function scoreRecord(record, query, mode) {
  const substances = unique(record.components.map((component) => component.name)).join(" ");
  const presentations = unique(record.presentations.map((presentation) => `${presentation.cip7} ${presentation.cip13} ${presentation.label}`)).join(" ");
  const codes = [record.cis, record.europeanNumber, record.mitm?.atc, presentations].join(" ");
  let score = 0;

  if (mode === "brand" || mode === "smart") score += scoreText(record.name, query, 130, 110, 92, 12);
  if (mode === "ingredient" || mode === "smart") score += scoreText(substances, query, 95, 80, 70, 8);
  if (mode === "labeler" || mode === "smart") score += scoreText(record.holder, query, 80, 60, 45, 6);
  if (mode === "ndc" || mode === "smart") score += scoreText(codes, query, 150, 120, 90, 0);
  if (mode === "smart") score += scoreText(presentations, query, 35, 22, 18, 2);

  if (score <= 0) return 0;

  if (record.authorisationStatus === "Autorisation active") score += 8;
  if (record.commercialStatus === "Commercialisée") score += 8;

  return Math.max(0, Math.min(score, 250));
}

function supplySignal(conditions) {
  const joined = normalize(conditions.join(" "));
  if (!joined) return "No CPD restriction listed";
  if (/(liste i|liste ii|stupefiant|prescription|hospitalier|reserve|professionnel)/.test(joined)) {
    return "Restriction listed";
  }
  return "Condition listed";
}

function mapRecord(record, score) {
  const substances = unique(record.components.map((component) => {
    const strength = component.strength ? ` ${component.strength}` : "";
    return `${component.name}${strength}`.trim();
  }));
  const packageCodes = unique(record.presentations.map((presentation) => presentation.cip13 || presentation.cip7));
  const sourceUrl = record.mitm?.url || `https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid=${record.cis}`;

  return {
    id: record.cis,
    source: "fr",
    score,
    brand: record.name || "N/A",
    generic: substances.slice(0, 3).join(", ") || "N/A",
    labeler: record.holder || "N/A",
    activeIngredients: substances.length ? substances : ["N/A"],
    dosageForm: record.form || "N/A",
    route: record.route || "N/A",
    category: record.authorisationStatus || "France BDPM",
    productType: record.commercialStatus || "N/A",
    productNdc: record.cis || "N/A",
    packageNdcs: packageCodes,
    listingExpiration: record.authorisationDate || "",
    marketingStart: record.authorisationDate || "",
    applicationNumber: record.cis || "N/A",
    packageCount: record.presentations.length,
    medicineUrl: sourceUrl,
    indication: "",
    procedure: record.procedure || "",
    bdmStatus: record.bdmStatus || "",
    europeanNumber: record.europeanNumber || "",
    enhancedSurveillance: record.enhancedSurveillance || "",
    atc: record.mitm?.atc || "",
    conditions: record.conditions,
    supplySignal: supplySignal(record.conditions),
    presentations: record.presentations.slice(0, 20)
  };
}

function rowSearchValues(row, field) {
  const product = [row.brand, row.generic, row.category, row.productType];
  const ingredient = row.activeIngredients;
  const company = [row.labeler];
  const code = [row.productNdc, row.packageNdcs, row.applicationNumber, row.europeanNumber, row.atc];

  if (field === "product") return product;
  if (field === "ingredient") return ingredient;
  if (field === "company") return company;
  if (field === "code") return code;
  return [product, ingredient, company, code, row.dosageForm, row.route, row.procedure, row.supplySignal];
}

function matchesWithin(row, withinText, field) {
  const normalized = normalize(withinText);
  if (!normalized) return true;

  const haystack = normalize(rowSearchValues(row, field || "all").map(toText).join(" "));
  return normalized.split(" ").filter(Boolean).every((token) => haystack.includes(token));
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  response.end(JSON.stringify(payload));
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  try {
    const url = new URL(request.url || "/", `https://${request.headers.host || "localhost"}`);
    const queryText = (url.searchParams.get("q") || "").trim();
    const mode = url.searchParams.get("mode") || "smart";
    const withinText = (url.searchParams.get("within") || "").trim();
    const withinField = url.searchParams.get("withinField") || "all";
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const commercializedOnly = url.searchParams.get("commercialized") !== "false";
    const activeOnly = url.searchParams.get("active") !== "false";
    const skip = (page - 1) * limit;
    const data = await loadFranceData();
    const query = {
      raw: queryText,
      normalized: normalize(queryText),
      tokens: queryTokens(queryText)
    };

    if (!query.normalized) {
      sendJson(response, 200, {
        meta: {
          source: "France BDPM",
          loadedAt: data.loadedAt,
          total_records: data.records.length,
          results: { total: 0, limit, skip }
        },
        results: []
      });
      return;
    }

    const rows = data.records
      .filter((record) => !activeOnly || record.authorisationStatus === "Autorisation active")
      .filter((record) => !commercializedOnly || record.commercialStatus === "Commercialisée")
      .map((record) => ({ record, score: scoreRecord(record, query, mode) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.record.name.localeCompare(b.record.name))
      .map((entry) => mapRecord(entry.record, entry.score))
      .filter((row) => matchesWithin(row, withinText, withinField));

    sendJson(response, 200, {
      meta: {
        source: "France BDPM",
        loadedAt: data.loadedAt,
        total_records: data.records.length,
        results: { total: rows.length, limit, skip }
      },
      results: rows.slice(skip, skip + limit)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: {
        message: error.message || "Failed to search France BDPM"
      }
    });
  }
};
