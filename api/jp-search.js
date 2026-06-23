const PMDA_OTC_INDEX_URL = "https://www.pmda.go.jp/PmdaSearch/js/data/otc/list_n.lib";
const PMDA_OTC_SEARCH_URL = "https://www.pmda.go.jp/PmdaSearch/otcSearch/";
const CACHE_MS = 6 * 60 * 60 * 1000;

const QUERY_ALIASES = {
  advil: ["\u30a2\u30c9\u30d3\u30eb"],
  allegra: ["\u30a2\u30ec\u30b0\u30e9"],
  aneton: ["\u30a2\u30cd\u30c8\u30f3"],
  aspirin: ["\u30a2\u30b9\u30d4\u30ea\u30f3", "\u30d0\u30d5\u30a1\u30ea\u30f3"],
  benza: ["\u30d9\u30f3\u30b6"],
  bufferin: ["\u30d0\u30d5\u30a1\u30ea\u30f3"],
  cabagin: ["\u30ad\u30e3\u30d9\u30b8\u30f3"],
  contac: ["\u30b3\u30f3\u30bf\u30c3\u30af"],
  eve: ["\u30a4\u30d6"],
  loxonin: ["\u30ed\u30ad\u30bd\u30cb\u30f3"],
  muhi: ["\u30e0\u30d2"],
  pabron: ["\u30d1\u30d6\u30ed\u30f3"],
  rohto: ["\u30ed\u30fc\u30c8"],
  salonpas: ["\u30b5\u30ed\u30f3\u30d1\u30b9"],
  seirogan: ["\u6b63\u9732\u4e38"],
  tylenol: ["\u30bf\u30a4\u30ec\u30ce\u30fc\u30eb"],
  vicks: ["\u30f4\u30a4\u30c3\u30af\u30b9", "\u30f4\u30a3\u30c3\u30af\u30b9"],
  voltaren: ["\u30dc\u30eb\u30bf\u30ec\u30f3"],

  acetaminophen: ["\u30a2\u30bb\u30c8\u30a2\u30df\u30ce\u30d5\u30a7\u30f3", "\u30bf\u30a4\u30ec\u30ce\u30fc\u30eb"],
  ambroxol: ["\u30a2\u30f3\u30d6\u30ed\u30ad\u30bd\u30fc\u30eb"],
  bromhexine: ["\u30d6\u30ed\u30e0\u30d8\u30ad\u30b7\u30f3"],
  carbocisteine: ["\u30ab\u30eb\u30dc\u30b7\u30b9\u30c6\u30a4\u30f3"],
  cetirizine: ["\u30bb\u30c1\u30ea\u30b8\u30f3"],
  chlorpheniramine: ["\u30af\u30ed\u30eb\u30d5\u30a7\u30cb\u30e9\u30df\u30f3"],
  dextromethorphan: ["\u30c7\u30ad\u30b9\u30c8\u30ed\u30e1\u30c8\u30eb\u30d5\u30a1\u30f3"],
  diphenhydramine: ["\u30b8\u30d5\u30a7\u30f3\u30d2\u30c9\u30e9\u30df\u30f3", "\u30c9\u30ea\u30a8\u30eb"],
  famotidine: ["\u30d5\u30a1\u30e2\u30c1\u30b8\u30f3", "\u30ac\u30b9\u30bf\u30fc"],
  fexofenadine: ["\u30d5\u30a7\u30ad\u30bd\u30d5\u30a7\u30ca\u30b8\u30f3", "\u30a2\u30ec\u30b0\u30e9"],
  ibuprofen: ["\u30a4\u30d6\u30d7\u30ed\u30d5\u30a7\u30f3", "\u30a4\u30d6"],
  loperamide: ["\u30ed\u30da\u30e9\u30df\u30c9"],
  loratadine: ["\u30ed\u30e9\u30bf\u30b8\u30f3", "\u30af\u30e9\u30ea\u30c1\u30f3"],
  loxoprofen: ["\u30ed\u30ad\u30bd\u30d7\u30ed\u30d5\u30a7\u30f3", "\u30ed\u30ad\u30bd\u30cb\u30f3"],
  paracetamol: ["\u30a2\u30bb\u30c8\u30a2\u30df\u30ce\u30d5\u30a7\u30f3", "\u30bf\u30a4\u30ec\u30ce\u30fc\u30eb"],
  pseudoephedrine: ["\u30d7\u30bd\u30a4\u30c9\u30a8\u30d5\u30a7\u30c9\u30ea\u30f3"],
  tranexamic: ["\u30c8\u30e9\u30cd\u30ad\u30b5\u30e0\u9178"],
  "tranexamic acid": ["\u30c8\u30e9\u30cd\u30ad\u30b5\u30e0\u9178"]
};

const MANUAL_FIELD_MODES = {
  ingredient: {
    field: "ingredient",
    officialName: "PMDA ingredient search"
  },
  labeler: {
    field: "company",
    officialName: "PMDA manufacturer / seller search"
  },
  ndc: {
    field: "code",
    officialName: "PMDA official search"
  }
};

const SMART_MANUAL_COMPANY_TERMS = new Set([
  "haleon",
  "gsk",
  "glaxosmithkline"
]);

let cachedPayload = null;
let cachedAt = 0;

function toText(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(" ");
  return String(value);
}

function normalize(value) {
  return toText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value) {
  return normalize(value).replace(/\s+/g, "");
}

function queryTokens(value) {
  return normalize(value).split(" ").filter((token) => token.length > 1);
}

function parseNames(text) {
  const seen = new Set();
  const names = [];

  [...text.matchAll(/'([^']+)'/g)].forEach((match) => {
    const name = match[1];
    const key = compact(name);
    if (key && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  });

  return names;
}

async function loadIndex() {
  if (cachedPayload && Date.now() - cachedAt < CACHE_MS) return cachedPayload;

  const response = await fetch(PMDA_OTC_INDEX_URL);
  if (!response.ok) throw new Error(`PMDA OTC index returned HTTP ${response.status}`);

  const text = await response.text();
  cachedPayload = {
    loadedAt: new Date().toISOString(),
    names: parseNames(text)
  };
  cachedAt = Date.now();
  return cachedPayload;
}

function queryVariants(queryText) {
  const variants = [queryText];
  const aliasKey = compact(queryText);
  (QUERY_ALIASES[aliasKey] || []).forEach((alias) => variants.push(alias));

  return variants.map((variant) => ({
    raw: variant,
    normalized: normalize(variant),
    compact: compact(variant),
    tokens: queryTokens(variant)
  }));
}

function scoreNameAgainstVariant(name, variant) {
  const normalizedName = normalize(name);
  const compactName = compact(name);
  let score = 0;

  if (normalizedName === variant.normalized || compactName === variant.compact) score += 150;
  if (normalizedName.startsWith(variant.normalized) || compactName.startsWith(variant.compact)) score += 118;
  if (normalizedName.includes(variant.normalized) || compactName.includes(variant.compact)) score += 94;

  variant.tokens.forEach((token) => {
    if (normalizedName.includes(token)) score += 10;
  });

  return Math.max(0, Math.min(score, 250));
}

function scoreName(name, variants) {
  return Math.max(...variants.map((variant) => scoreNameAgainstVariant(name, variant)));
}

function mapName(name, score, aliasesUsed) {
  return {
    id: name,
    source: "jp",
    score,
    brand: name,
    generic: aliasesUsed ? "Product-name alias match" : "Verify in PMDA",
    labeler: "N/A",
    activeIngredients: ["N/A"],
    dosageForm: "PMDA product-name index",
    route: "General-use / guidance-required medicines",
    category: "Japan PMDA OTC/BTC",
    productType: aliasesUsed ? "Package insert search index + alias" : "Package insert search index",
    productNdc: "PMDA OTC",
    packageNdcs: ["Official PMDA index"],
    listingExpiration: "",
    marketingStart: "",
    applicationNumber: "N/A",
    packageCount: 0,
    medicineUrl: PMDA_OTC_SEARCH_URL,
    indication: "",
    sourceLanding: PMDA_OTC_SEARCH_URL,
    supplySignal: "Name appears in PMDA general-use / guidance-required medicine package-insert search index. Risk category, company, ingredient, and package insert should be verified on the official PMDA search page."
  };
}

function rowSearchValues(row, field) {
  const product = [row.brand, row.generic, row.category, row.productType];
  const ingredient = row.activeIngredients;
  const company = [row.labeler];
  const code = [row.productNdc, row.packageNdcs, row.applicationNumber];

  if (field === "product") return product;
  if (field === "ingredient") return ingredient;
  if (field === "company") return company;
  if (field === "code") return code;
  return [product, ingredient, company, code, row.dosageForm, row.route];
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

function sendManualFieldResponse(response, { queryText, mode, limit, skip, reason }) {
  const fieldConfig = MANUAL_FIELD_MODES[mode] || {
    field: reason || "official PMDA field",
    officialName: "PMDA official search"
  };

  sendJson(response, 200, {
    meta: {
      source: "PMDA OTC/BTC official portal",
      sourceUrl: PMDA_OTC_SEARCH_URL,
      accessMode: "manual-field",
      field: fieldConfig.field,
      officialName: fieldConfig.officialName,
      query: queryText,
      results: { total: 0, limit, skip },
      notice: "The official PMDA OTC/BTC portal supports this field, but this app currently automates only the public product-name suggestion index. Use the official PMDA portal for ingredient, company, risk category, and package insert verification."
    },
    results: []
  });
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
    const mode = (url.searchParams.get("mode") || "smart").trim();
    const withinText = (url.searchParams.get("within") || "").trim();
    const withinField = url.searchParams.get("withinField") || "all";
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const query = {
      raw: queryText,
      normalized: normalize(queryText),
      compact: compact(queryText),
      tokens: queryTokens(queryText)
    };

    if (!query.normalized) {
      const payload = await loadIndex();
      sendJson(response, 200, {
        meta: {
          source: "PMDA OTC/BTC product-name index",
          sourceUrl: PMDA_OTC_SEARCH_URL,
          loadedAt: payload.loadedAt,
          total_records: payload.names.length,
          results: { total: 0, limit, skip }
        },
        results: []
      });
      return;
    }

    if (MANUAL_FIELD_MODES[mode]) {
      sendManualFieldResponse(response, { queryText, mode, limit, skip });
      return;
    }

    if (mode === "smart" && SMART_MANUAL_COMPANY_TERMS.has(query.compact)) {
      sendManualFieldResponse(response, { queryText, mode: "labeler", limit, skip, reason: "company" });
      return;
    }

    const payload = await loadIndex();
    const variants = queryVariants(queryText);
    const aliasesUsed = variants.length > 1;

    const rows = payload.names
      .map((name) => ({ name, score: scoreName(name, variants) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"))
      .map((entry) => mapName(entry.name, entry.score, aliasesUsed))
      .filter((row) => matchesWithin(row, withinText, withinField));

    sendJson(response, 200, {
      meta: {
        source: "PMDA OTC/BTC product-name index",
        sourceUrl: PMDA_OTC_SEARCH_URL,
        loadedAt: payload.loadedAt,
        total_records: payload.names.length,
        aliasesUsed,
        queryVariants: variants.map((variant) => variant.raw),
        searchScope: "product-name-index",
        results: { total: rows.length, limit, skip },
        notice: "PMDA's official portal supports product name, ingredient, company, risk category, and package-insert searches. This API endpoint currently searches only the public product-name suggestion index, with a small English-to-Japanese alias dictionary."
      },
      results: rows.slice(skip, skip + limit)
    });
  } catch (error) {
    sendJson(response, 500, {
      error: {
        message: error.message || "Failed to search PMDA OTC/BTC index"
      }
    });
  }
};
