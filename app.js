const API_BASE = "https://api.fda.gov";
const NDC_ENDPOINT = `${API_BASE}/drug/ndc.json`;
const LABEL_ENDPOINT = `${API_BASE}/drug/label.json`;

const state = {
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
  searchMode: document.getElementById("searchMode"),
  categoryFilter: document.getElementById("categoryFilter"),
  resultLimit: document.getElementById("resultLimit"),
  sortMode: document.getElementById("sortMode"),
  strictMode: document.getElementById("strictMode"),
  statusTitle: document.getElementById("statusTitle"),
  statusDetail: document.getElementById("statusDetail"),
  resultCount: document.getElementById("resultCount"),
  resultsBody: document.getElementById("resultsBody"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageLabel: document.getElementById("pageLabel"),
  errorBox: document.getElementById("errorBox"),
  apiDate: document.getElementById("apiDate"),
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
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, " ")
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
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return value || "N/A";
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function joinValues(values, fallback = "N/A") {
  const list = compactUnique(values);
  return list.length ? list.join(", ") : fallback;
}

function getTextList(item, field) {
  return compactUnique([item[field], item.openfda?.[field]]);
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

function makeSearchExpression(query, broad = false) {
  const mode = els.searchMode.value;
  const raw = query.trim();
  const phrase = openFdaPhrase(raw);
  const wild = wildcardTerm(raw);
  const isNdc = /^[0-9-]{4,}$/.test(raw);
  const base = makeBaseClauses();
  let fields;

  if (mode === "ndc" || isNdc) {
    fields = [
      `product_ndc:${phrase}`,
      `packaging.package_ndc:${phrase}`
    ];
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

function buildSearchUrl(query, page, broad = false) {
  const limit = Number(els.resultLimit.value);
  const skip = (page - 1) * limit;
  const expression = makeSearchExpression(query, broad);
  const params = new URLSearchParams({
    search: expression,
    limit: String(limit),
    skip: String(skip)
  });

  return `${NDC_ENDPOINT}?${params.toString()}`;
}

function scoreItem(item, query) {
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

function mapItem(item, index) {
  const activeIngredients = getActiveIngredients(item);
  const packages = toArray(item.packaging);
  const packageNdcs = compactUnique(packages.map((pkg) => pkg.package_ndc));
  const splSetId = item.openfda?.spl_set_id?.[0] || "";
  const productNdc = item.product_ndc || item.openfda?.product_ndc?.[0] || "";

  return {
    id: `${productNdc || item.product_id || index}-${index}`,
    item,
    score: scoreItem(item, state.query),
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
    packageCount: packages.length
  };
}

function sortRows(rows) {
  const mode = els.sortMode.value;
  const copy = [...rows];

  copy.sort((a, b) => {
    if (mode === "brand") return a.brand.localeCompare(b.brand);
    if (mode === "labeler") return a.labeler.localeCompare(b.labeler);
    if (mode === "expiration") return String(b.listingExpiration).localeCompare(String(a.listingExpiration));
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
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }
  window.history.replaceState(null, "", url);
}

function renderEmpty(message) {
  els.resultsBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">${escapeHtml(message)}</td>
    </tr>
  `;
}

function renderRows() {
  const strict = els.strictMode.checked;
  let rows = sortRows(state.rows);
  if (strict) rows = rows.filter((row) => row.score >= 30);

  els.resultCount.textContent = rows.length.toLocaleString();

  if (!rows.length) {
    renderEmpty("조건에 맞는 OTC 제품이 없습니다.");
    return;
  }

  els.resultsBody.innerHTML = rows.map((row, index) => {
    const ingredientText = row.activeIngredients.slice(0, 4).map(escapeHtml).join("<br>");
    const moreIngredients = row.activeIngredients.length > 4
      ? `<span class="subtext">+${row.activeIngredients.length - 4} more</span>`
      : "";
    const packageText = row.packageNdcs.slice(0, 2).map(escapeHtml).join("<br>") || "N/A";
    const packageMore = row.packageNdcs.length > 2
      ? `<br><span class="subtext">+${row.packageNdcs.length - 2} packages</span>`
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
          <button class="label-button" type="button" data-detail="${escapeHtml(row.id)}" aria-expanded="false">상세</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPager() {
  const limit = Number(els.resultLimit.value);
  const lastPage = Math.max(1, Math.ceil(state.total / limit));
  els.pageLabel.textContent = `${state.page} / ${lastPage}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= lastPage || state.page * limit > 25000;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  if (response.status === 404 && body?.error?.code === "NOT_FOUND") {
    return {
      meta: {
        last_updated: body?.meta?.last_updated,
        results: { total: 0, limit: 0, skip: 0 }
      },
      results: []
    };
  }

  if (!response.ok) {
    const message = body?.error?.message || body?.error?.code || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

async function runSearch({ page = 1, broad = false } = {}) {
  const query = els.keyword.value.trim();
  if (!query) {
    state.query = "";
    state.page = 1;
    state.total = 0;
    state.rows = [];
    state.rawItems = [];
    setStatus("검색어를 입력하세요.", "FDA NDC Directory에서 현재 등록된 OTC 제품을 조회합니다.");
    els.resultCount.textContent = "0";
    renderPager();
    renderEmpty("검색 결과가 여기에 표시됩니다.");
    syncUrlQuery("");
    return;
  }

  state.query = query;
  state.page = page;
  syncUrlQuery(query);
  showError("");
  setStatus(`검색 중: ${escapeHtml(query)}`, "openFDA NDC Directory를 조회하고 있습니다.");
  els.resultsBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="7" class="empty-state">검색 중입니다.</td>
    </tr>
  `;

  try {
    const url = buildSearchUrl(query, page, broad);
    state.lastSearchUrl = url;
    const data = await fetchJson(url);
    let items = data.results || [];
    let total = data.meta?.results?.total || 0;

    if (!items.length && !broad && els.searchMode.value === "smart") {
      const fallbackUrl = buildSearchUrl(query, page, true);
      state.lastSearchUrl = fallbackUrl;
      const fallbackData = await fetchJson(fallbackUrl);
      items = fallbackData.results || [];
      total = fallbackData.meta?.results?.total || 0;
    }

    state.total = total;
    state.rawItems = items;
    state.rows = items.map(mapItem);
    const metaDate = data.meta?.last_updated;
    if (metaDate) els.apiDate.textContent = `Updated ${metaDate}`;

    setStatus(
      `검색어: ${escapeHtml(query)}`,
      `API 결과 ${total.toLocaleString()}건 중 ${items.length.toLocaleString()}건 표시`
    );
    renderRows();
    renderPager();
  } catch (error) {
    state.total = 0;
    state.rows = [];
    setStatus("검색 실패", "쿼리를 단순하게 바꾸거나 잠시 후 다시 시도하세요.");
    showError(error.message);
    renderPager();
    renderEmpty("openFDA 응답을 가져오지 못했습니다.");
  }
}

function makePackageMarkup(row) {
  const packages = toArray(row.item.packaging);
  if (!packages.length) return '<p class="muted">등록된 package 정보가 없습니다.</p>';

  return packages.map((pkg) => `
    <div class="detail-block">
      <strong>${escapeHtml(pkg.package_ndc || "N/A")}</strong>
      <div>${escapeHtml(pkg.description || "N/A")}</div>
      <div class="muted">Start: ${escapeHtml(formatDate(pkg.marketing_start_date))}</div>
    </div>
  `).join("");
}

function makeRegulatoryMarkup(row) {
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
  if (row.productNdc && row.productNdc !== "N/A") {
    searches.push(`openfda.product_ndc:${openFdaPhrase(row.productNdc)}`);
  }
  if (row.splSetId) {
    searches.push(`set_id:${openFdaPhrase(row.splSetId)}`);
  }
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
  if (!label) return '<p class="muted">연결된 Drug Label을 찾지 못했습니다.</p>';

  const sections = [
    ["Purpose", sectionText(label, ["purpose"])],
    ["Uses", sectionText(label, ["indications_and_usage"])],
    ["Directions", sectionText(label, ["directions"])],
    ["Warnings", sectionText(label, ["warnings", "do_not_use", "ask_doctor"])]
  ].filter(([, text]) => text);

  if (!sections.length) return '<p class="muted">표시할 label section이 없습니다.</p>';

  return sections.map(([title, text]) => `
    <div class="detail-block">
      <strong>${escapeHtml(title)}</strong>
      <div>${escapeHtml(text.slice(0, 700))}${text.length > 700 ? "..." : ""}</div>
    </div>
  `).join("");
}

async function fetchLabel(row) {
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

async function toggleDetail(button) {
  const rowId = button.dataset.detail;
  const row = sortRows(state.rows).filter((item) => !els.strictMode.checked || item.score >= 30)
    .find((item) => item.id === rowId);
  if (!row) return;

  const currentTr = button.closest("tr");
  const next = currentTr.nextElementSibling;
  const isOpen = button.getAttribute("aria-expanded") === "true";

  document.querySelectorAll(".detail-row").forEach((detailRow) => detailRow.remove());
  document.querySelectorAll(".label-button[aria-expanded='true']").forEach((openButton) => {
    openButton.setAttribute("aria-expanded", "false");
  });

  if (isOpen) return;

  button.setAttribute("aria-expanded", "true");
  const detail = els.detailTemplate.content.firstElementChild.cloneNode(true);
  detail.querySelector('[data-field="packages"]').innerHTML = makePackageMarkup(row);
  detail.querySelector('[data-field="regulatory"]').innerHTML = makeRegulatoryMarkup(row);
  detail.querySelector('[data-field="label"]').innerHTML = '<p class="muted">Drug Label 조회 중입니다.</p>';
  currentTr.after(detail);

  if (next?.classList.contains("detail-row")) next.remove();

  const label = await fetchLabel(row);
  if (button.getAttribute("aria-expanded") !== "true") return;
  detail.querySelector('[data-field="label"]').innerHTML = makeLabelMarkup(label);
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch({ page: 1 });
});

[els.searchMode, els.categoryFilter, els.resultLimit].forEach((control) => {
  control.addEventListener("change", () => {
    if (state.query) runSearch({ page: 1 });
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
const initialQuery = params.get("q");
if (initialQuery) {
  els.keyword.value = initialQuery;
  runSearch({ page: 1 });
}
