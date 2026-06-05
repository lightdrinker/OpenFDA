const API_BASE = "https://api.fda.gov";
const NDC_ENDPOINT = `${API_BASE}/drug/ndc.json`;
const LABEL_ENDPOINT = `${API_BASE}/drug/label.json`;
const EU_ENDPOINT = "/api/eu-search";
const UK_ENDPOINT = "/api/uk-search";
const DE_ENDPOINT = "/api/de-search";
const JP_ENDPOINT = "/api/jp-search";

const SOURCES = {
  us: {
    label: "US OTC",
    apiLabel: "openFDA NDC",
    badge: "HUMAN OTC DRUG",
    note: "United States OTC products from openFDA NDC Directory.",
    placeholder: "Example: advil, aspirin, acetaminophen, 0573-0147",
    empty: "No matching US OTC products.",
    codeHeader: "NDC",
    formHeader: "Form",
    dateSortLabel: "Listing expiration",
    detailButton: "Detail",
    warnings: [
      "Filtered to openFDA NDC entries with HUMAN OTC DRUG and finished:true.",
      "Verify current label, monograph/NDA/ANDA status, and marketing status for final CPP review."
    ]
  },
  uk: {
    label: "UK MHRA",
    apiLabel: "MHRA Products",
    badge: "Medicine documents",
    note: "United Kingdom MHRA Products document search by product, active substance, or Product Licence number.",
    placeholder: "Example: advil, nurofen, ibuprofen, PL 00327/0197",
    empty: "No matching UK MHRA medicine documents.",
    codeHeader: "PL No.",
    formHeader: "Document",
    dateSortLabel: "Document date",
    detailButton: "MHRA",
    warnings: [
      "Results are document-centric (SmPC/PIL/PAR), not a clean product master table.",
      "P/GSL/POM legal supply category is not exposed here; verify it in the linked SmPC/PIL."
    ]
  },
  eu: {
    label: "EMA Centralized",
    apiLabel: "EMA medicines JSON",
    badge: "Centralised procedure",
    note: "EU centralized medicines from EMA.",
    placeholder: "Example: paracetamol, ibuprofen, emedastine, EMEA/H/C/000223",
    empty: "No matching EU centralized medicines.",
    codeHeader: "EMA No.",
    formHeader: "Group",
    dateSortLabel: "Last updated",
    detailButton: "EMA",
    warnings: [
      "Covers centralised-procedure medicines only, not all EU national OTC products.",
      "OTC/legal supply status is not marked directly; verify national status separately."
    ]
  },
  fr: {
    label: "France BDPM",
    apiLabel: "France BDPM",
    badge: "National register",
    note: "France national medicines register from BDPM.",
    placeholder: "Example: advil, nurofen, doliprane, ibuprofene, 68634000",
    empty: "No matching France BDPM medicines.",
    codeHeader: "CIS / CIP",
    formHeader: "Form",
    dateSortLabel: "AMM date",
    detailButton: "BDPM",
    warnings: [
      "CPD restrictions are shown when listed.",
      "No CPD restriction listed is useful but does not automatically prove OTC status."
    ]
  },
  de: {
    label: "Germany AMIce",
    apiLabel: "BfArM AMIce",
    badge: "Manual portal",
    note: "Germany national register is BfArM AMIce Public Part.",
    placeholder: "Example: ibuprofen, aspirin, nurofen, Zul.-Nr.",
    empty: "No automated Germany rows are available from this app.",
    codeHeader: "Zul.-Nr.",
    formHeader: "Register",
    dateSortLabel: "Updated",
    detailButton: "AMIce",
    manualUrl: "https://portal.dimdi.de/amguifree/?accessid=amis_off_am_ppv&lang=de",
    manualLabel: "Open AMIce Public Part",
    manualOnly: true,
    warnings: [
      "Automated AMIce JSON/API search is not available here.",
      "Company/brand checks such as Haleon or Advil must be verified manually in the linked AMIce portal."
    ]
  },
  jp: {
    label: "Japan PMDA",
    apiLabel: "PMDA OTC/BTC",
    badge: "Product-name index",
    note: "Japan PMDA general-use / guidance-required medicine package-insert search index. This tab searches the official product-name index.",
    placeholder: "Example: イブ, バファリン, ロキソニン, アレグラ, EVE",
    empty: "No matching Japan PMDA product names.",
    codeHeader: "PMDA",
    formHeader: "Index",
    dateSortLabel: "Loaded",
    detailButton: "PMDA",
    manualUrl: "https://www.pmda.go.jp/PmdaSearch/otcSearch/",
    manualLabel: "Open PMDA OTC search",
    warnings: [
      "This Japan tab searches PMDA's official OTC/guidance-required product-name index only.",
      "Ingredient, company, risk category (要指導/第1類/第2類/第3類), and package insert details must be verified on the PMDA search page."
    ]
  }
};

SOURCES.jp = {
  label: "Japan PMDA",
  apiLabel: "PMDA OTC/BTC",
  badge: "Product-name index",
  note: "Japan PMDA general-use / guidance-required package-insert product-name index.",
  placeholder: "Example: EVE, Bufferin, Loxonin, Allegra",
  empty: "No PMDA product-name rows for this search.",
  codeHeader: "PMDA",
  formHeader: "Index",
  dateSortLabel: "Loaded",
  detailButton: "PMDA",
  manualUrl: "https://www.pmda.go.jp/PmdaSearch/otcSearch/",
  manualLabel: "Open PMDA OTC search",
  warnings: [
    "This tab searches PMDA's official product-name index only, with a few English brand aliases.",
    "Company searches such as Haleon and non-indexed brand names such as Advil may return no rows; verify ingredient, company, risk category, and package insert on PMDA."
  ]
};

const state = {
  source: "us",
  query: "",
  page: 1,
  total: 0,
  rows: [],
  rawItems: [],
  lastSearchUrl: "",
  labelCache: new Map()
};

const els = {
  form: document.getElementById("searchForm"),
  keyword: document.getElementById("keyword"),
  sourceTabs: document.querySelectorAll("[data-source]"),
  sourceNote: document.getElementById("sourceNote"),
  sourceWarnings: document.getElementById("sourceWarnings"),
  sourceBadge: document.getElementById("sourceBadge"),
  searchMode: document.getElementById("searchMode"),
  categoryControl: document.getElementById("categoryControl"),
  categoryFilter: document.getElementById("categoryFilter"),
  resultLimit: document.getElementById("resultLimit"),
  sortMode: document.getElementById("sortMode"),
  strictMode: document.getElementById("strictMode"),
  statusTitle: document.getElementById("statusTitle"),
  statusDetail: document.getElementById("statusDetail"),
  resultCount: document.getElementById("resultCount"),
  resultsBody: document.getElementById("resultsBody"),
  tableScroll: document.getElementById("tableScroll"),
  manualResult: document.getElementById("manualResult"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageLabel: document.getElementById("pageLabel"),
  errorBox: document.getElementById("errorBox"),
  apiDate: document.getElementById("apiDate"),
  codeHeader: document.getElementById("codeHeader"),
  formHeader: document.getElementById("formHeader"),
  detailTemplate: document.getElementById("detailTemplate")
};

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function compactUnique(values) {
  const seen = new Set();
  const output = [];

  values.flatMap(toArray).forEach((value) => {
    const text = String(value || "").trim();
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      output.push(text);
    }
  });

  return output;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\uac00-\ud7a3-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openFdaPhrase(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function wildcardTerm(value) {
  const clean = String(value || "").replace(/[^a-zA-Z0-9-]/g, "");
  if (clean.length < 3) return "";
  return `${clean}*`;
}

function formatDate(value) {
  const text = String(value || "").trim();
  if (!text) return "N/A";
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/");
    return `${year}-${month}-${day}`;
  }
  return text;
}

function dateValue(value) {
  const formatted = formatDate(value);
  const time = Date.parse(formatted);
  return Number.isNaN(time) ? 0 : time;
}

function joinValues(values, fallback = "N/A") {
  const list = compactUnique(values);
  return list.length ? list.join(", ") : fallback;
}

function getActiveIngredients(item) {
  return compactUnique(
    toArray(item.active_ingredients).map((entry) => {
      if (!entry) return "";
      const name = entry.name || "";
      const strength = entry.strength ? ` ${entry.strength}` : "";
      return `${name}${strength}`.trim();
    })
  );
}

function makeBaseClauses() {
  const clauses = ['product_type:"HUMAN OTC DRUG"', "finished:true"];
  const category = els.categoryFilter.value;
  if (category) clauses.push(`marketing_category:${openFdaPhrase(category)}`);
  return clauses;
}

function makeFieldClause(field, phrase, wild) {
  const clauses = [`${field}:${phrase}`];
  if (wild) clauses.push(`${field}:${wild}`);
  return clauses;
}

function makeUsSearchExpression(query, broad = false) {
  const mode = els.searchMode.value;
  const raw = query.trim();
  const phrase = openFdaPhrase(raw);
  const wild = wildcardTerm(raw);
  const isNdc = /^[0-9-]{4,}$/.test(raw);
  const base = makeBaseClauses();
  let fields;

  if (mode === "ndc" || isNdc) {
    fields = [`product_ndc:${phrase}`, `packaging.package_ndc:${phrase}`];
  } else if (mode === "brand") {
    fields = makeFieldClause("brand_name", phrase, wild);
  } else if (mode === "ingredient") {
    fields = [
      ...makeFieldClause("generic_name", phrase, wild),
      ...makeFieldClause("active_ingredients.name", phrase, wild)
    ];
  } else if (mode === "labeler") {
    fields = makeFieldClause("labeler_name", phrase, wild);
  } else if (broad) {
    fields = [phrase];
  } else {
    fields = [
      ...makeFieldClause("brand_name", phrase, wild),
      ...makeFieldClause("generic_name", phrase, wild),
      ...makeFieldClause("active_ingredients.name", phrase, wild),
      ...makeFieldClause("labeler_name", phrase, wild),
      `product_ndc:${phrase}`,
      `packaging.package_ndc:${phrase}`
    ];
  }

  return `${base.join(" AND ")} AND (${fields.join(" OR ")})`;
}

function buildUsSearchUrl(query, page, broad = false) {
  const limit = Number(els.resultLimit.value);
  const skip = (page - 1) * limit;
  const params = new URLSearchParams({
    search: makeUsSearchExpression(query, broad),
    limit: String(limit),
    skip: String(skip)
  });
  return `${NDC_ENDPOINT}?${params.toString()}`;
}

function buildEuSearchUrl(query, page) {
  const params = new URLSearchParams({
    q: query,
    mode: els.searchMode.value,
    limit: els.resultLimit.value,
    page: String(page),
    status: "Authorised"
  });
  return `${EU_ENDPOINT}?${params.toString()}`;
}

function buildFrSearchUrl(query, page) {
  const params = new URLSearchParams({
    q: query,
    mode: els.searchMode.value,
    limit: els.resultLimit.value,
    page: String(page)
  });
  return `/api/fr-search?${params.toString()}`;
}

function buildUkSearchUrl(query, page) {
  const params = new URLSearchParams({
    q: query,
    mode: els.searchMode.value,
    limit: els.resultLimit.value,
    page: String(page)
  });
  return `${UK_ENDPOINT}?${params.toString()}`;
}

function buildDeSearchUrl(query, page) {
  const params = new URLSearchParams({
    q: query,
    mode: els.searchMode.value,
    limit: els.resultLimit.value,
    page: String(page)
  });
  return `${DE_ENDPOINT}?${params.toString()}`;
}

function buildJpSearchUrl(query, page) {
  const params = new URLSearchParams({
    q: query,
    mode: els.searchMode.value,
    limit: els.resultLimit.value,
    page: String(page)
  });
  return `${JP_ENDPOINT}?${params.toString()}`;
}

function scoreUsItem(item, query) {
  const kw = normalize(query);
  const tokens = kw.split(" ").filter((token) => token.length > 1);
  const brand = normalize(joinValues([item.brand_name, item.openfda?.brand_name], ""));
  const generic = normalize(joinValues([item.generic_name, item.openfda?.generic_name], ""));
  const labeler = normalize(joinValues([item.labeler_name, item.openfda?.manufacturer_name], ""));
  const ingredients = normalize(joinValues(getActiveIngredients(item), ""));
  const ndcs = normalize(joinValues([item.product_ndc, item.packaging?.map((pkg) => pkg.package_ndc)], ""));
  const combined = [brand, generic, labeler, ingredients, ndcs].join(" ");

  let score = 0;
  if (ndcs === kw) score += 160;
  if (ndcs.includes(kw)) score += 95;
  if (brand === kw) score += 120;
  if (brand.startsWith(kw)) score += 105;
  if (brand.includes(kw)) score += 88;
  if (generic === kw) score += 92;
  if (generic.includes(kw)) score += 70;
  if (ingredients.includes(kw)) score += 68;
  if (labeler.includes(kw)) score += 35;
  if (combined.includes(kw)) score += 20;

  tokens.forEach((token) => {
    if (brand.includes(token)) score += 12;
    if (generic.includes(token)) score += 8;
    if (ingredients.includes(token)) score += 8;
  });

  return Math.max(0, Math.min(score, 250));
}

function mapUsItem(item, index) {
  const activeIngredients = getActiveIngredients(item);
  const packages = toArray(item.packaging);
  const packageNdcs = compactUnique(packages.map((pkg) => pkg.package_ndc));
  const splSetId = item.openfda?.spl_set_id?.[0] || "";
  const productNdc = item.product_ndc || item.openfda?.product_ndc?.[0] || "";

  return {
    id: `us-${productNdc || item.product_id || index}-${index}`,
    source: "us",
    item,
    score: scoreUsItem(item, state.query),
    brand: joinValues([item.brand_name, item.openfda?.brand_name]),
    generic: joinValues([item.generic_name, item.openfda?.generic_name]),
    labeler: joinValues([item.labeler_name, item.openfda?.manufacturer_name]),
    activeIngredients: activeIngredients.length ? activeIngredients : ["N/A"],
    dosageForm: joinValues([item.dosage_form, item.openfda?.dosage_form]),
    route: joinValues([item.route, item.openfda?.route]),
    category: item.marketing_category || "N/A",
    productType: item.product_type || "N/A",
    productNdc: productNdc || "N/A",
    packageNdcs,
    listingExpiration: item.listing_expiration_date || "",
    marketingStart: item.marketing_start_date || "",
    splSetId,
    applicationNumber: item.application_number || "N/A",
    packageCount: packages.length,
    medicineUrl: "",
    indication: ""
  };
}

function mapEuItem(item, index) {
  return {
    ...item,
    id: `eu-${item.id || item.productNdc || index}-${index}`,
    source: "eu",
    item
  };
}

function mapFrItem(item, index) {
  return {
    ...item,
    id: `fr-${item.id || item.productNdc || index}-${index}`,
    source: "fr",
    item
  };
}

function mapUkItem(item, index) {
  return {
    ...item,
    id: `uk-${item.id || item.productNdc || index}-${index}`,
    source: "uk",
    item
  };
}

function mapDeItem(item, index) {
  return {
    ...item,
    id: `de-${item.id || item.productNdc || index}-${index}`,
    source: "de",
    item
  };
}

function mapJpItem(item, index) {
  return {
    ...item,
    id: `jp-${item.id || item.brand || index}-${index}`,
    source: "jp",
    item
  };
}

function sortRows(rows) {
  const mode = els.sortMode.value;
  const copy = [...rows];

  copy.sort((a, b) => {
    if (mode === "brand") return a.brand.localeCompare(b.brand);
    if (mode === "labeler") return a.labeler.localeCompare(b.labeler);
    if (mode === "expiration") return dateValue(b.listingExpiration) - dateValue(a.listingExpiration);
    return b.score - a.score || a.brand.localeCompare(b.brand);
  });

  return copy;
}

function scoreClass(score) {
  if (score >= 90) return "good";
  if (score >= 45) return "mid";
  return "low";
}

function setStatus(title, detail = "") {
  els.statusTitle.innerHTML = title;
  els.statusDetail.innerHTML = detail;
}

function showError(message) {
  if (!message) {
    els.errorBox.hidden = true;
    els.errorBox.textContent = "";
    return;
  }

  els.errorBox.hidden = false;
  els.errorBox.textContent = message;
}

function syncUrlQuery(query) {
  const url = new URL(window.location.href);
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");

  if (state.source === "us") url.searchParams.delete("source");
  else url.searchParams.set("source", state.source);

  window.history.replaceState(null, "", url);
}

function renderEmpty(message) {
  els.tableScroll.hidden = false;
  els.manualResult.hidden = true;
  els.resultsBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">${escapeHtml(message)}</td>
    </tr>
  `;
}

function sourceLink(config) {
  if (!config.manualUrl) return "";
  return `<a class="inline-link" href="${escapeHtml(config.manualUrl)}" target="_blank" rel="noreferrer">${escapeHtml(config.manualLabel || "Open source")}</a>`;
}

function renderWarnings() {
  const warnings = SOURCES[state.source].warnings || [];
  if (!warnings.length) {
    els.sourceWarnings.innerHTML = "";
    els.sourceWarnings.hidden = true;
    return;
  }

  els.sourceWarnings.hidden = false;
  const link = sourceLink(SOURCES[state.source]);
  els.sourceWarnings.innerHTML = `
    <div class="source-limit-card">
      <div class="source-limit-title">Source limits</div>
      <div class="source-limit-body">
        ${warnings.map((warning) => `<span>${escapeHtml(warning)}</span>`).join("")}
        ${link ? `<span>${link}</span>` : ""}
      </div>
    </div>
  `;
}

function renderSourceEmpty() {
  const config = SOURCES[state.source];
  els.tableScroll.hidden = false;
  els.manualResult.hidden = true;
  els.resultsBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">
        ${escapeHtml(config.empty)}
      </td>
    </tr>
  `;
}

function renderManualSource(config) {
  els.resultCount.textContent = "Manual";
  els.tableScroll.hidden = true;
  els.manualResult.hidden = false;
  els.manualResult.innerHTML = `
    <div class="manual-card">
      <div>
        <strong>Manual verification required</strong>
        <p>${escapeHtml(config.empty)}</p>
      </div>
      ${sourceLink(config)}
    </div>
  `;
}

function currentRows() {
  const strict = els.strictMode.checked;
  let rows = sortRows(state.rows);
  if (strict) rows = rows.filter((row) => row.score >= 30);
  return rows;
}

function renderRows() {
  const config = SOURCES[state.source];
  if (config.manualOnly) {
    renderManualSource(config);
    return;
  }

  els.tableScroll.hidden = false;
  els.manualResult.hidden = true;
  const rows = currentRows();
  els.resultCount.textContent = rows.length.toLocaleString();

  if (!rows.length) {
    renderSourceEmpty();
    return;
  }

  els.resultsBody.innerHTML = rows.map((row, index) => {
    const ingredientText = toArray(row.activeIngredients).slice(0, 4).map(escapeHtml).join("<br>");
    const moreIngredients = toArray(row.activeIngredients).length > 4
      ? `<span class="subtext">+${toArray(row.activeIngredients).length - 4} more</span>`
      : "";
    const packageText = toArray(row.packageNdcs).slice(0, 2).map(escapeHtml).join("<br>") || "N/A";
    const packageMore = toArray(row.packageNdcs).length > 2
      ? `<br><span class="subtext">+${toArray(row.packageNdcs).length - 2} more</span>`
      : "";

    return `
      <tr data-row-id="${escapeHtml(row.id)}" data-index="${index}">
        <td><span class="score-pill ${scoreClass(row.score)}">${row.score}</span></td>
        <td>
          <span class="product-name">${escapeHtml(row.brand)}</span>
          <span class="subtext">${escapeHtml(row.generic)}</span>
          <div class="tag-list">
            <span class="tag category">${escapeHtml(row.category)}</span>
            <span class="tag">${escapeHtml(row.productType)}</span>
          </div>
        </td>
        <td>${ingredientText}${moreIngredients}</td>
        <td>
          ${escapeHtml(row.labeler)}
          <div class="subtext">Application: ${escapeHtml(row.applicationNumber)}</div>
        </td>
        <td>
          ${escapeHtml(row.dosageForm)}
          <div class="subtext">${escapeHtml(row.route)}</div>
        </td>
        <td>
          <strong>${escapeHtml(row.productNdc)}</strong>
          <div class="subtext">${packageText}${packageMore}</div>
        </td>
        <td>
          <button class="label-button" type="button" data-detail="${escapeHtml(row.id)}" aria-expanded="false">${SOURCES[state.source].detailButton}</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPager() {
  if (SOURCES[state.source].manualOnly) {
    els.pageLabel.textContent = "Manual";
    els.prevPage.disabled = true;
    els.nextPage.disabled = true;
    return;
  }

  const limit = Number(els.resultLimit.value);
  const lastPage = Math.max(1, Math.ceil(state.total / limit));
  els.pageLabel.textContent = `${state.page} / ${lastPage}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= lastPage || (state.source === "us" && state.page * limit > 25000);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  if (response.status === 404 && body?.error?.code === "NOT_FOUND") {
    return {
      meta: { results: { total: 0, limit: 0, skip: 0 } },
      results: []
    };
  }

  if (!response.ok) {
    const message = body?.error?.message || body?.error?.code || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

async function runUsSearch(query, page, broad) {
  const url = buildUsSearchUrl(query, page, broad);
  state.lastSearchUrl = url;
  let data = await fetchJson(url);
  let items = data.results || [];
  let total = data.meta?.results?.total || 0;

  if (!items.length && !broad && els.searchMode.value === "smart") {
    const fallbackUrl = buildUsSearchUrl(query, page, true);
    state.lastSearchUrl = fallbackUrl;
    data = await fetchJson(fallbackUrl);
    items = data.results || [];
    total = data.meta?.results?.total || 0;
  }

  state.total = total;
  state.rawItems = items;
  state.rows = items.map(mapUsItem);
  if (data.meta?.last_updated) els.apiDate.textContent = `Updated ${data.meta.last_updated}`;

  setStatus(
    `Search: ${escapeHtml(query)}`,
    `openFDA returned ${total.toLocaleString()} matches; showing ${items.length.toLocaleString()} on this page.`
  );
}

async function runEuSearch(query, page) {
  const url = buildEuSearchUrl(query, page);
  state.lastSearchUrl = url;
  const data = await fetchJson(url);
  const items = data.results || [];
  const total = data.meta?.results?.total || 0;

  state.total = total;
  state.rawItems = items;
  state.rows = items.map(mapEuItem);
  if (data.meta?.timestamp) els.apiDate.textContent = `Updated ${data.meta.timestamp.slice(0, 10)}`;

  setStatus(
    `Search: ${escapeHtml(query)}`,
    `EMA returned ${total.toLocaleString()} authorised centralised matches; showing ${items.length.toLocaleString()} on this page.`
  );
}

async function runFrSearch(query, page) {
  const url = buildFrSearchUrl(query, page);
  state.lastSearchUrl = url;
  const data = await fetchJson(url);
  const items = data.results || [];
  const total = data.meta?.results?.total || 0;

  state.total = total;
  state.rawItems = items;
  state.rows = items.map(mapFrItem);
  if (data.meta?.loadedAt) els.apiDate.textContent = `Loaded ${data.meta.loadedAt.slice(0, 10)}`;

  setStatus(
    `Search: ${escapeHtml(query)}`,
    `France BDPM returned ${total.toLocaleString()} active commercialised matches; showing ${items.length.toLocaleString()} on this page.`
  );
}

async function runUkSearch(query, page) {
  const url = buildUkSearchUrl(query, page);
  state.lastSearchUrl = url;
  const data = await fetchJson(url);
  const items = data.results || [];
  const total = data.meta?.results?.total || 0;

  state.total = total;
  state.rawItems = items;
  state.rows = items.map(mapUkItem);
  els.apiDate.textContent = "MHRA Products";

  setStatus(
    `Search: ${escapeHtml(query)}`,
    `MHRA returned ${total.toLocaleString()} medicine document matches; showing ${items.length.toLocaleString()} on this page. Legal supply category is not structured in this result.`
  );
}

async function runDeSearch(query, page) {
  const url = buildDeSearchUrl(query, page);
  state.lastSearchUrl = url;
  const data = await fetchJson(url);
  const items = data.results || [];

  state.total = data.meta?.results?.total || 0;
  state.rawItems = items;
  state.rows = items.map(mapDeItem);
  els.apiDate.textContent = "BfArM AMIce";

  setStatus(
    "Manual verification source",
    `Search term: ${escapeHtml(query)}. Use the AMIce portal linked in Source limits above.`
  );
}

async function runJpSearch(query, page) {
  const url = buildJpSearchUrl(query, page);
  state.lastSearchUrl = url;
  const data = await fetchJson(url);
  const items = data.results || [];
  const total = data.meta?.results?.total || 0;

  state.total = total;
  state.rawItems = items;
  state.rows = items.map(mapJpItem);
  if (data.meta?.loadedAt) els.apiDate.textContent = `Loaded ${data.meta.loadedAt.slice(0, 10)}`;

  if (total) {
    setStatus(
      `Search: ${escapeHtml(query)}`,
      `PMDA product-name index returned ${total.toLocaleString()} matches; showing ${items.length.toLocaleString()} on this page.`
    );
  } else {
    setStatus(
      "No PMDA product-name match",
      `Search term: ${escapeHtml(query)}. Try a Japanese product name or use PMDA search from Source limits.`
    );
  }
}

async function runSearch({ page = 1, broad = false } = {}) {
  const query = els.keyword.value.trim();
  if (!query) {
    state.query = "";
    state.page = 1;
    state.total = 0;
    state.rows = [];
    state.rawItems = [];
    setStatus("Enter a search term.", "Choose US OTC or EU Centralized, then search by product, ingredient, code, or company.");
    els.resultCount.textContent = "0";
    renderPager();
    renderEmpty("Search results will appear here.");
    syncUrlQuery("");
    return;
  }

  state.query = query;
  state.page = page;
  syncUrlQuery(query);
  showError("");
  setStatus(`Searching: ${escapeHtml(query)}`, `${SOURCES[state.source].label} data is loading.`);
  els.resultsBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="7" class="empty-state">Searching...</td>
    </tr>
  `;

  try {
    if (state.source === "eu") await runEuSearch(query, page);
    else if (state.source === "fr") await runFrSearch(query, page);
    else if (state.source === "uk") await runUkSearch(query, page);
    else if (state.source === "de") await runDeSearch(query, page);
    else if (state.source === "jp") await runJpSearch(query, page);
    else await runUsSearch(query, page, broad);
    renderRows();
    renderPager();
  } catch (error) {
    state.total = 0;
    state.rows = [];
    setStatus("Search failed", "Try a simpler query or wait a moment before searching again.");
    showError(error.message);
    renderPager();
    renderEmpty(`${SOURCES[state.source].label} data could not be loaded.`);
  }
}

function makeUsPackageMarkup(row) {
  const packages = toArray(row.item.packaging);
  if (!packages.length) return '<p class="muted">No package information is listed.</p>';

  return packages.map((pkg) => `
    <div class="detail-block">
      <strong>${escapeHtml(pkg.package_ndc || "N/A")}</strong>
      <div>${escapeHtml(pkg.description || "N/A")}</div>
      <div class="muted">Start: ${escapeHtml(formatDate(pkg.marketing_start_date))}</div>
    </div>
  `).join("");
}

function makeEuDatasetMarkup(row) {
  return `
    <div class="detail-block">
      <strong>Dataset</strong>
      <div>EMA medicines JSON, centralised procedure only.</div>
    </div>
    <div class="detail-block">
      <strong>OTC signal</strong>
      <div>Not directly available in EMA dataset. Check SmPC/PIL or national register for legal supply status.</div>
    </div>
    <div class="detail-block">
      <strong>Therapeutic area</strong>
      <div>${escapeHtml(row.therapeuticArea || "N/A")}</div>
    </div>
  `;
}

function makeFrPresentationMarkup(row) {
  const presentations = toArray(row.presentations);
  if (!presentations.length) return '<p class="muted">No presentation information is listed.</p>';

  return presentations.map((presentation) => `
    <div class="detail-block">
      <strong>${escapeHtml(presentation.cip13 || presentation.cip7 || "N/A")}</strong>
      <div>${escapeHtml(presentation.label || "N/A")}</div>
      <div class="muted">${escapeHtml(presentation.status || "N/A")} / ${escapeHtml(presentation.commercialStatus || "N/A")}</div>
      <div class="muted">Reimbursement: ${escapeHtml(presentation.reimbursementRate || "N/A")} / Price: ${escapeHtml(presentation.price || "N/A")}</div>
    </div>
  `).join("");
}

function makeUkDocumentMarkup(row) {
  return `
    <div class="detail-block">
      <strong>${escapeHtml(row.documentType || row.productType || "MHRA document")}</strong>
      <div>${escapeHtml(row.brand)}</div>
      <div class="muted">File: ${escapeHtml(row.documentFile || "N/A")}</div>
    </div>
    <div class="detail-block">
      <strong>Territory</strong>
      <div>${escapeHtml(row.territory || row.route || "UK-wide document")}</div>
    </div>
    <a class="source-link" href="${escapeHtml(row.medicineUrl)}" target="_blank" rel="noreferrer">MHRA document</a>
  `;
}

function makeJpIndexMarkup(row) {
  return `
    <div class="detail-block">
      <strong>PMDA product name</strong>
      <div>${escapeHtml(row.brand)}</div>
    </div>
    <div class="detail-block">
      <strong>Index type</strong>
      <div>${escapeHtml(row.productType || "Package insert search index")}</div>
    </div>
    <a class="source-link" href="${escapeHtml(row.medicineUrl)}" target="_blank" rel="noreferrer">PMDA OTC search</a>
  `;
}

function makeRegulatoryMarkup(row) {
  if (row.source === "jp") {
    return `
      <div class="detail-block">
        <strong>Source</strong>
        <div>PMDA general-use / guidance-required medicine search</div>
      </div>
      <div class="detail-block">
        <strong>Structured fields</strong>
        <div>Product name index only in this app.</div>
      </div>
      <div class="detail-block">
        <strong>Required verification</strong>
        <div>Confirm risk category, ingredient, company, and package insert on PMDA.</div>
      </div>
      <a class="source-link" href="${escapeHtml(row.medicineUrl)}" target="_blank" rel="noreferrer">PMDA OTC search</a>
    `;
  }

  if (row.source === "uk") {
    const productSearchUrl = `https://products.mhra.gov.uk/search/?search=${encodeURIComponent(row.productNdc)}`;
    return `
      <div class="detail-block">
        <strong>Product Licence number</strong>
        <div>${escapeHtml(row.productNdc)}</div>
      </div>
      <div class="detail-block">
        <strong>Source</strong>
        <div>MHRA Products</div>
      </div>
      <div class="detail-block">
        <strong>Document date</strong>
        <div>${escapeHtml(formatDate(row.marketingStart))}</div>
      </div>
      <div class="detail-block">
        <strong>Supply category</strong>
        <div>${escapeHtml(row.supplySignal || "Check SmPC/PIL for legal supply status.")}</div>
      </div>
      <a class="source-link" href="${escapeHtml(productSearchUrl)}" target="_blank" rel="noreferrer">MHRA product search</a>
    `;
  }

  if (row.source === "eu") {
    return `
      <div class="detail-block">
        <strong>EMA product number</strong>
        <div>${escapeHtml(row.productNdc)}</div>
      </div>
      <div class="detail-block">
        <strong>Status</strong>
        <div>${escapeHtml(row.productType)}</div>
      </div>
      <div class="detail-block">
        <strong>Marketing authorisation date</strong>
        <div>${escapeHtml(formatDate(row.marketingStart))}</div>
      </div>
      <div class="detail-block">
        <strong>European Commission decision</strong>
        <div>${escapeHtml(formatDate(row.decisionDate))}</div>
      </div>
      <div class="detail-block">
        <strong>ATC</strong>
        <div>${escapeHtml(row.atc || "N/A")}</div>
      </div>
      <a class="source-link" href="${escapeHtml(row.medicineUrl)}" target="_blank" rel="noreferrer">EMA medicine page</a>
    `;
  }

  if (row.source === "fr") {
    return `
      <div class="detail-block">
        <strong>Code CIS</strong>
        <div>${escapeHtml(row.productNdc)}</div>
      </div>
      <div class="detail-block">
        <strong>AMM status</strong>
        <div>${escapeHtml(row.category)}</div>
      </div>
      <div class="detail-block">
        <strong>Commercial status</strong>
        <div>${escapeHtml(row.productType)}</div>
      </div>
      <div class="detail-block">
        <strong>Procedure</strong>
        <div>${escapeHtml(row.procedure || "N/A")}</div>
      </div>
      <div class="detail-block">
        <strong>AMM date</strong>
        <div>${escapeHtml(formatDate(row.marketingStart))}</div>
      </div>
      <div class="detail-block">
        <strong>ATC</strong>
        <div>${escapeHtml(row.atc || "N/A")}</div>
      </div>
      <a class="source-link" href="${escapeHtml(row.medicineUrl)}" target="_blank" rel="noreferrer">BDPM medicine page</a>
    `;
  }

  const sourceUrl = `${NDC_ENDPOINT}?search=${encodeURIComponent(`product_ndc:${openFdaPhrase(row.productNdc)}`)}&limit=1`;
  return `
    <div class="detail-block">
      <strong>Marketing category</strong>
      <div>${escapeHtml(row.category)}</div>
    </div>
    <div class="detail-block">
      <strong>Marketing start</strong>
      <div>${escapeHtml(formatDate(row.marketingStart))}</div>
    </div>
    <div class="detail-block">
      <strong>Listing expiration</strong>
      <div>${escapeHtml(formatDate(row.listingExpiration))}</div>
    </div>
    <div class="detail-block">
      <strong>SPL set ID</strong>
      <div>${escapeHtml(row.splSetId || "N/A")}</div>
    </div>
    <a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">openFDA JSON</a>
  `;
}

function labelSearchesFor(row) {
  const searches = [];
  if (row.productNdc && row.productNdc !== "N/A") searches.push(`openfda.product_ndc:${openFdaPhrase(row.productNdc)}`);
  if (row.splSetId) searches.push(`set_id:${openFdaPhrase(row.splSetId)}`);
  return searches;
}

function sectionText(label, keys) {
  for (const key of keys) {
    const values = compactUnique(label?.[key]);
    if (values.length) return values.join(" ");
  }
  return "";
}

function makeLabelMarkup(label) {
  if (!label) return '<p class="muted">No connected Drug Label was found.</p>';

  const sections = [
    ["Purpose", sectionText(label, ["purpose"])],
    ["Uses", sectionText(label, ["indications_and_usage"])],
    ["Directions", sectionText(label, ["directions"])],
    ["Warnings", sectionText(label, ["warnings", "do_not_use", "ask_doctor"])]
  ].filter(([, text]) => text);

  if (!sections.length) return '<p class="muted">No label section is available.</p>';

  return sections.map(([title, text]) => `
    <div class="detail-block">
      <strong>${escapeHtml(title)}</strong>
      <div>${escapeHtml(text.slice(0, 700))}${text.length > 700 ? "..." : ""}</div>
    </div>
  `).join("");
}

function makeEuLabelMarkup(row) {
  return `
    <div class="detail-block">
      <strong>Therapeutic indication</strong>
      <div>${escapeHtml(row.indication || "N/A")}</div>
    </div>
    <div class="detail-block">
      <strong>Last updated</strong>
      <div>${escapeHtml(formatDate(row.lastUpdated || row.listingExpiration))}</div>
    </div>
    <div class="detail-block">
      <strong>Revision</strong>
      <div>${escapeHtml(row.revisionNumber || "N/A")}</div>
    </div>
  `;
}

function makeFrConditionMarkup(row) {
  const conditions = toArray(row.conditions);
  const conditionMarkup = conditions.length
    ? conditions.map((condition) => `<div>${escapeHtml(condition)}</div>`).join("")
    : '<div>No CPD restriction listed in BDPM.</div>';

  return `
    <div class="detail-block">
      <strong>Supply signal</strong>
      <div>${escapeHtml(row.supplySignal || "N/A")}</div>
    </div>
    <div class="detail-block">
      <strong>Conditions de prescription et de delivrance</strong>
      ${conditionMarkup}
    </div>
    <div class="detail-block">
      <strong>Note</strong>
      <div>Absence of a CPD restriction is useful, but final OTC/legal supply status should be verified in the official product page.</div>
    </div>
  `;
}

function makeUkContextMarkup(row) {
  return `
    <div class="detail-block">
      <strong>Search context</strong>
      <div>${escapeHtml(row.indication || "No highlighted document context returned.")}</div>
    </div>
    <div class="detail-block">
      <strong>Note</strong>
      <div>MHRA Products results are document-centric (SPC, PIL, PAR). For OTC screening, confirm P/GSL/POM status in the linked SmPC/PIL or other official UK source.</div>
    </div>
  `;
}

function makeJpContextMarkup(row) {
  return `
    <div class="detail-block">
      <strong>Supply signal</strong>
      <div>${escapeHtml(row.supplySignal || "Verify on PMDA.")}</div>
    </div>
    <div class="detail-block">
      <strong>Note</strong>
      <div>PMDA's product-name index confirms the name is in the OTC/guidance-required search surface, but this app does not yet extract the detailed package insert fields.</div>
    </div>
  `;
}

async function fetchLabel(row) {
  if (row.source !== "us") return null;

  const cacheKey = row.splSetId || row.productNdc;
  if (state.labelCache.has(cacheKey)) return state.labelCache.get(cacheKey);

  const searches = labelSearchesFor(row);
  for (const search of searches) {
    const fullSearch = `openfda.product_type:"HUMAN OTC DRUG" AND ${search}`;
    const params = new URLSearchParams({ search: fullSearch, limit: "1" });
    try {
      const data = await fetchJson(`${LABEL_ENDPOINT}?${params.toString()}`);
      const label = data.results?.[0] || null;
      if (label) {
        state.labelCache.set(cacheKey, label);
        return label;
      }
    } catch {
      // Try the next identifier before showing an empty label state.
    }
  }

  state.labelCache.set(cacheKey, null);
  return null;
}

function setDetailTitles(detail, row) {
  const titles = detail.querySelectorAll("h3");
  if (row.source === "eu") {
    titles[0].textContent = "Dataset";
    titles[1].textContent = "Regulatory";
    titles[2].textContent = "Indication";
    return;
  }

  if (row.source === "fr") {
    titles[0].textContent = "Presentations";
    titles[1].textContent = "Regulatory";
    titles[2].textContent = "Supply";
    return;
  }

  if (row.source === "uk") {
    titles[0].textContent = "Document";
    titles[1].textContent = "Regulatory";
    titles[2].textContent = "Context";
    return;
  }

  if (row.source === "jp") {
    titles[0].textContent = "PMDA Index";
    titles[1].textContent = "Verification";
    titles[2].textContent = "Caveat";
    return;
  }

  titles[0].textContent = "Packages";
  titles[1].textContent = "Regulatory";
  titles[2].textContent = "Drug Label";
}

async function toggleDetail(button) {
  const rowId = button.dataset.detail;
  const row = currentRows().find((item) => item.id === rowId);
  if (!row) return;

  const currentTr = button.closest("tr");
  const isOpen = button.getAttribute("aria-expanded") === "true";

  document.querySelectorAll(".detail-row").forEach((detailRow) => detailRow.remove());
  document.querySelectorAll(".label-button[aria-expanded='true']").forEach((openButton) => {
    openButton.setAttribute("aria-expanded", "false");
  });

  if (isOpen) return;

  button.setAttribute("aria-expanded", "true");
  const detail = els.detailTemplate.content.firstElementChild.cloneNode(true);
  setDetailTitles(detail, row);
  detail.querySelector('[data-field="packages"]').innerHTML = row.source === "eu"
    ? makeEuDatasetMarkup(row)
    : row.source === "fr"
      ? makeFrPresentationMarkup(row)
      : row.source === "uk"
        ? makeUkDocumentMarkup(row)
      : row.source === "jp"
        ? makeJpIndexMarkup(row)
      : makeUsPackageMarkup(row);
  detail.querySelector('[data-field="regulatory"]').innerHTML = makeRegulatoryMarkup(row);
  detail.querySelector('[data-field="label"]').innerHTML = row.source === "eu"
    ? makeEuLabelMarkup(row)
    : row.source === "fr"
      ? makeFrConditionMarkup(row)
      : row.source === "uk"
        ? makeUkContextMarkup(row)
      : row.source === "jp"
        ? makeJpContextMarkup(row)
      : '<p class="muted">Loading Drug Label...</p>';
  currentTr.after(detail);

  if (row.source !== "us") return;

  const label = await fetchLabel(row);
  if (button.getAttribute("aria-expanded") !== "true") return;
  detail.querySelector('[data-field="label"]').innerHTML = makeLabelMarkup(label);
}

function applySource(source, { run = false } = {}) {
  state.source = SOURCES[source] ? source : "us";
  const config = SOURCES[state.source];

  els.sourceTabs.forEach((tab) => {
    const active = tab.dataset.source === state.source;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });

  els.sourceNote.textContent = config.note;
  renderWarnings();
  els.sourceBadge.textContent = config.badge;
  els.apiDate.textContent = config.apiLabel;
  els.keyword.placeholder = config.placeholder;
  els.codeHeader.textContent = config.codeHeader;
  els.formHeader.textContent = config.formHeader;
  els.categoryControl.classList.toggle("is-hidden", state.source !== "us");
  els.categoryFilter.disabled = state.source !== "us";
  els.sortMode.querySelector('option[value="expiration"]').textContent = config.dateSortLabel;

  state.page = 1;
  state.total = 0;
  state.rows = [];
  state.rawItems = [];
  showError("");
  setStatus("Enter a search term.", config.note);
  renderPager();
  if (config.manualOnly) renderManualSource(config);
  else renderEmpty("Search results will appear here.");
  syncUrlQuery(els.keyword.value.trim());

  if (run && els.keyword.value.trim()) runSearch({ page: 1 });
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch({ page: 1 });
});

els.sourceTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    applySource(tab.dataset.source, { run: Boolean(els.keyword.value.trim()) });
  });
});

[els.searchMode, els.categoryFilter, els.resultLimit].forEach((control) => {
  control.addEventListener("change", () => {
    if (state.query || els.keyword.value.trim()) runSearch({ page: 1 });
  });
});

[els.sortMode, els.strictMode].forEach((control) => {
  control.addEventListener("change", () => {
    renderRows();
    renderPager();
  });
});

els.prevPage.addEventListener("click", () => {
  if (state.page > 1) runSearch({ page: state.page - 1 });
});

els.nextPage.addEventListener("click", () => {
  runSearch({ page: state.page + 1 });
});

els.resultsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-detail]");
  if (button) toggleDetail(button);
});

const params = new URLSearchParams(window.location.search);
const initialSource = params.get("source") || "us";
const initialQuery = params.get("q");
applySource(initialSource);

if (initialQuery) {
  els.keyword.value = initialQuery;
  runSearch({ page: 1 });
}
