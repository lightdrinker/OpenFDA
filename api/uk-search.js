const MHRA_SEARCH_URL = "https://mhraproducts4853.search.windows.net/indexes/products-index/docs";
const MHRA_API_KEY = "17CCFC430C1A78A169B392A35A99C49D";
const MHRA_PRODUCTS_URL = "https://products.mhra.gov.uk";

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

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
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  const seen = new Set();
  const output = [];

  values.flatMap(toArray).forEach((value) => {
    const text = toText(value).trim();
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      output.push(text);
    }
  });

  return output;
}

function queryTokens(query) {
  return normalize(query).split(" ").filter((token) => token.length > 1);
}

function cleanTitle(title) {
  return toText(title)
    .replace(/\s+-\s+UK\/H\/.*$/i, "")
    .replace(/\s+-\s+(PLGB|PL|THR|NR)\s*[0-9/,\-\s]+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPlNumber(value) {
  const text = toText(value).replace(/\s+/g, "").toUpperCase();
  const match = text.match(/^(PLGB|PL|THR|NR)(\d{5})(\d{4})$/);
  if (match) return `${match[1]} ${match[2]}/${match[3]}`;
  return toText(value) || "N/A";
}

function documentLabel(value) {
  const key = normalize(value);
  if (key === "spc") return "SmPC";
  if (key === "pil") return "Patient Information Leaflet";
  if (key === "par") return "Public Assessment Report";
  return toText(value) || "MHRA document";
}

function titleIngredients(title) {
  return unique(
    [...toText(title).matchAll(/\(([^)]+)\)/g)]
      .map((match) => match[1])
      .filter((text) => text.length <= 90)
      .filter((text) => !/\bPL\s*\d/i.test(text))
  );
}

function usefulSuggestions(item) {
  const noise = new Set([
    "par",
    "pil",
    "spc",
    "ukpar",
    "public assessment report",
    "patient information leaflet",
    "summary of product characteristics"
  ]);

  return unique(item.suggestions)
    .filter((value) => !noise.has(normalize(value)))
    .filter((value) => !/^PL\s*\d/i.test(value));
}

function inferCompany(item) {
  const companyLike = usefulSuggestions(item).find((value) => (
    /\b(limited|ltd|plc|gmbh|s\.?a\.?|inc|pharma|pharmaceutical|healthcare|laborator)/i.test(value)
  ));

  return companyLike || "N/A";
}

function inferIngredients(item) {
  const substances = unique([
    item.substance_name,
    titleIngredients(item.title),
    usefulSuggestions(item).filter((value) => !/\d/.test(value) && value.length <= 50)
  ]);

  return substances.length ? substances : ["N/A"];
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

function scoreRecord(item, query, mode) {
  const title = item.title || item.product_name || "";
  const product = cleanTitle(title);
  const substances = inferIngredients(item).join(" ");
  const plNumbers = toArray(item.pl_number).map(formatPlNumber).join(" ");
  const company = inferCompany(item);
  const suggestions = usefulSuggestions(item).join(" ");
  let score = Math.min(60, Math.round(Number(item["@search.score"] || 0) * 18));

  if (mode === "brand" || mode === "smart") score += scoreText(product, query, 130, 110, 92, 12);
  if (mode === "ingredient" || mode === "smart") score += scoreText(substances, query, 95, 80, 70, 8);
  if (mode === "labeler" || mode === "smart") score += scoreText(company, query, 80, 60, 45, 6);
  if (mode === "ndc" || mode === "smart") score += scoreText(plNumbers, query, 150, 120, 90, 0);
  if (mode === "smart") score += scoreText(suggestions, query, 32, 24, 18, 2);

  return Math.max(0, Math.min(score, 250));
}

function snippetFromHighlights(item) {
  const highlights = item["@search.highlights"] || {};
  const content = toArray(highlights.content).join(" ");
  if (content) return content.replace(/<[^>]+>/g, "").slice(0, 700);
  return usefulSuggestions(item).join(", ").slice(0, 700);
}

function mapRecord(item, score) {
  const plNumbers = unique(item.pl_number).map(formatPlNumber);
  const productCode = plNumbers[0] || "N/A";
  const ingredients = inferIngredients(item);
  const docType = documentLabel(item.doc_type);
  const title = item.title || item.product_name || "N/A";

  return {
    id: `${productCode}-${item.file_name || item.metadata_storage_name || title}`,
    source: "uk",
    score,
    brand: cleanTitle(title) || title,
    generic: ingredients.slice(0, 3).join(", ") || "N/A",
    labeler: inferCompany(item),
    activeIngredients: ingredients,
    dosageForm: docType,
    route: item.territory || "UK-wide document",
    category: "UK MHRA Products",
    productType: docType,
    productNdc: productCode,
    packageNdcs: unique([plNumbers.slice(1), item.file_name]).slice(0, 6),
    listingExpiration: item.created || "",
    marketingStart: item.created || "",
    applicationNumber: productCode,
    packageCount: 0,
    medicineUrl: item.metadata_storage_path || MHRA_PRODUCTS_URL,
    indication: snippetFromHighlights(item),
    documentType: docType,
    documentFile: item.file_name || "",
    territory: item.territory || "",
    sourceLanding: MHRA_PRODUCTS_URL,
    supplySignal: "Legal category is not exposed by the MHRA Products search result. Check the SmPC/PIL for P, GSL, or POM status."
  };
}

function rowSearchValues(row, field) {
  const product = [row.brand, row.generic, row.category, row.productType];
  const ingredient = row.activeIngredients;
  const company = [row.labeler];
  const code = [row.productNdc, row.packageNdcs, row.applicationNumber, row.documentFile];

  if (field === "product") return product;
  if (field === "ingredient") return ingredient;
  if (field === "company") return company;
  if (field === "code") return code;
  return [product, ingredient, company, code, row.dosageForm, row.route, row.indication];
}

function matchesWithin(row, withinText, field) {
  const normalized = normalize(withinText);
  if (!normalized) return true;

  const haystack = normalize(rowSearchValues(row, field || "all").map(toText).join(" "));
  return normalized.split(" ").filter(Boolean).every((token) => haystack.includes(token));
}

async function searchMhra(queryText, page, limit, withinText = "") {
  const skip = (page - 1) * limit;
  const searchText = [queryText, withinText].map((value) => toText(value).trim()).filter(Boolean).join(" ");
  const params = new URLSearchParams({
    "api-version": "2017-11-11",
    "api-key": MHRA_API_KEY,
    "$count": "true",
    "$top": String(limit),
    "$skip": String(skip),
    search: searchText,
    queryType: "simple",
    searchMode: "all",
    scoringProfile: "preferKeywords",
    highlight: "content"
  });

  const response = await fetch(`${MHRA_SEARCH_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error(`MHRA Products search returned HTTP ${response.status}`);
  return response.json();
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
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
    const skip = (page - 1) * limit;
    const query = {
      raw: queryText,
      normalized: normalize(queryText),
      tokens: queryTokens(queryText)
    };

    if (!query.normalized) {
      sendJson(response, 200, {
        meta: {
          source: "MHRA Products",
          sourceUrl: MHRA_PRODUCTS_URL,
          results: { total: 0, limit, skip }
        },
        results: []
      });
      return;
    }

    const payload = await searchMhra(queryText, page, limit, withinText);
    const rows = (payload.value || [])
      .map((item) => ({ item, score: scoreRecord(item, query, mode) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || cleanTitle(a.item.title).localeCompare(cleanTitle(b.item.title)))
      .map((entry) => mapRecord(entry.item, entry.score))
      .filter((row) => matchesWithin(row, withinText, withinField));
    const upstreamTotal = Number(payload["@odata.count"] || rows.length);
    const displayTotal = rows.length < limit ? skip + rows.length : upstreamTotal;

    sendJson(response, 200, {
      meta: {
        source: "MHRA Products",
        sourceUrl: MHRA_PRODUCTS_URL,
        results: {
          total: Math.min(upstreamTotal, displayTotal),
          limit,
          skip
        },
        notice: "MHRA Products search returns medicine documents. Legal supply category is not provided as a structured field."
      },
      results: rows
    });
  } catch (error) {
    sendJson(response, 500, {
      error: {
        message: error.message || "Failed to search MHRA Products"
      }
    });
  }
};
