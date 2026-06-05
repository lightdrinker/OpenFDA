const PMDA_OTC_INDEX_URL = "https://www.pmda.go.jp/PmdaSearch/js/data/otc/list_n.lib";
const PMDA_OTC_SEARCH_URL = "https://www.pmda.go.jp/PmdaSearch/otcSearch/";
const CACHE_MS = 6 * 60 * 60 * 1000;
const QUERY_ALIASES = {
  eve: ["イブ"],
  bufferin: ["バファリン"],
  loxonin: ["ロキソニン"],
  allegra: ["アレグラ"],
  tylenol: ["タイレノール"],
  aspirin: ["アスピリン"],
  pabron: ["パブロン"]
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
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ぁ-んァ-ン一-龯]+/g, " ")
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

function mapName(name, score) {
  return {
    id: name,
    source: "jp",
    score,
    brand: name,
    generic: "Verify in PMDA",
    labeler: "N/A",
    activeIngredients: ["N/A"],
    dosageForm: "PMDA product-name index",
    route: "General-use / guidance-required medicines",
    category: "Japan PMDA OTC/BTC",
    productType: "Package insert search index",
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
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const payload = await loadIndex();
    const query = {
      raw: queryText,
      normalized: normalize(queryText),
      tokens: queryTokens(queryText)
    };
    const variants = queryVariants(queryText);

    if (!query.normalized) {
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

    const rows = payload.names
      .map((name) => ({ name, score: scoreName(name, variants) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"))
      .map((entry) => mapName(entry.name, entry.score));

    sendJson(response, 200, {
      meta: {
        source: "PMDA OTC/BTC product-name index",
        sourceUrl: PMDA_OTC_SEARCH_URL,
        loadedAt: payload.loadedAt,
        total_records: payload.names.length,
        results: { total: rows.length, limit, skip },
        notice: "PMDA exposes a lightweight official product-name index for OTC/guidance-required medicines. This app searches that index; ingredient, company, risk category, and package insert details must be verified on the PMDA search page."
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
