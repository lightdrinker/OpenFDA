const EMA_MEDICINES_URL = "https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json";
const CACHE_MS = 6 * 60 * 60 * 1000;

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

function tokens(value) {
  return normalize(value).split(" ").filter((token) => token.length > 1);
}

function scoreField(text, query, exact, prefix, includes, tokenScore = 0) {
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

function scoreMedicine(item, query, mode) {
  const product = item.name_of_medicine;
  const inn = item.international_non_proprietary_name_common_name;
  const active = item.active_substance;
  const mah = item.marketing_authorisation_developer_applicant_holder;
  const productNumber = item.ema_product_number;
  const atc = item.atc_code_human;
  const indication = item.therapeutic_indication;
  let score = 0;

  if (mode === "brand" || mode === "smart") {
    score += scoreField(product, query, 130, 110, 92, 12);
  }

  if (mode === "ingredient" || mode === "smart") {
    score += scoreField(inn, query, 95, 80, 68, 8);
    score += scoreField(active, query, 92, 76, 66, 8);
  }

  if (mode === "labeler" || mode === "smart") {
    score += scoreField(mah, query, 80, 60, 42, 6);
  }

  if (mode === "ndc" || mode === "smart") {
    score += scoreField(productNumber, query, 150, 120, 90, 0);
    score += scoreField(atc, query, 110, 90, 70, 0);
  }

  if (mode === "smart") {
    score += scoreField(indication, query, 24, 18, 14, 2);
  }

  return Math.max(0, Math.min(score, 250));
}

function mapMedicine(item, score) {
  return {
    id: item.ema_product_number || item.name_of_medicine,
    source: "eu",
    score,
    brand: item.name_of_medicine || "N/A",
    generic: item.international_non_proprietary_name_common_name || "N/A",
    labeler: item.marketing_authorisation_developer_applicant_holder || "N/A",
    activeIngredients: [item.active_substance || "N/A"],
    dosageForm: item.pharmacotherapeutic_group_human || "N/A",
    route: "Centralised procedure",
    category: "EU Centralised",
    productType: item.medicine_status || "N/A",
    productNdc: item.ema_product_number || "N/A",
    packageNdcs: [item.atc_code_human || "No ATC"],
    listingExpiration: item.last_updated_date || "",
    marketingStart: item.marketing_authorisation_date || "",
    applicationNumber: item.ema_product_number || "N/A",
    packageCount: 0,
    medicineUrl: item.medicine_url || "",
    indication: item.therapeutic_indication || "",
    therapeuticArea: item.therapeutic_area_mesh || "",
    atc: item.atc_code_human || "",
    decisionDate: item.european_commission_decision_date || "",
    revisionNumber: item.revision_number || "",
    lastUpdated: item.last_updated_date || "",
    isOtcKnown: false
  };
}

function rowSearchValues(row, field) {
  const product = [row.brand, row.generic, row.category, row.productType];
  const ingredient = row.activeIngredients;
  const company = [row.labeler];
  const code = [row.productNdc, row.packageNdcs, row.applicationNumber, row.atc];

  if (field === "product") return product;
  if (field === "ingredient") return ingredient;
  if (field === "company") return company;
  if (field === "code") return code;
  return [product, ingredient, company, code, row.dosageForm, row.route, row.indication, row.therapeuticArea];
}

function matchesWithin(row, withinText, field) {
  const normalized = normalize(withinText);
  if (!normalized) return true;

  const haystack = normalize(rowSearchValues(row, field || "all").map(toText).join(" "));
  return normalized.split(" ").filter(Boolean).every((token) => haystack.includes(token));
}

async function loadMedicines() {
  if (cachedPayload && Date.now() - cachedAt < CACHE_MS) return cachedPayload;

  const response = await fetch(EMA_MEDICINES_URL);
  if (!response.ok) {
    throw new Error(`EMA dataset returned HTTP ${response.status}`);
  }

  cachedPayload = await response.json();
  cachedAt = Date.now();
  return cachedPayload;
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
    const status = url.searchParams.get("status") || "Authorised";
    const skip = (page - 1) * limit;
    const payload = await loadMedicines();
    const query = {
      raw: queryText,
      normalized: normalize(queryText),
      tokens: tokens(queryText)
    };

    if (!query.normalized) {
      sendJson(response, 200, {
        meta: {
          source: "EMA medicines JSON",
          timestamp: payload.meta?.timestamp || null,
          total_records: payload.meta?.total_records || 0,
          results: { total: 0, limit, skip }
        },
        results: []
      });
      return;
    }

    const rows = (payload.data || [])
      .filter((item) => item.category === "Human")
      .filter((item) => status === "all" || item.medicine_status === status)
      .map((item) => ({ item, score: scoreMedicine(item, query, mode) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || toText(a.item.name_of_medicine).localeCompare(toText(b.item.name_of_medicine)))
      .map((entry) => mapMedicine(entry.item, entry.score))
      .filter((row) => matchesWithin(row, withinText, withinField));

    sendJson(response, 200, {
      meta: {
        source: "EMA medicines JSON",
        timestamp: payload.meta?.timestamp || null,
        total_records: payload.meta?.total_records || rows.length,
        results: { total: rows.length, limit, skip }
      },
      results: rows.slice(skip, skip + limit)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: {
        message: error.message || "Failed to search EMA medicines dataset"
      }
    });
  }
};
