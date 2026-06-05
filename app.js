const API_BASE = "https://api.fda.gov";
const NDC_ENDPOINT = `${API_BASE}/drug/ndc.json`;
const LABEL_ENDPOINT = `${API_BASE}/drug/label.json`;
const EU_ENDPOINT = "/api/eu-search";
const UK_ENDPOINT = "/api/uk-search";
const DE_ENDPOINT = "/api/de-search";
const JP_ENDPOINT = "/api/jp-search";
const SUPPORTED_LANGS = ["en", "ko"];
const DEFAULT_LANG = "en";

function initialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get("lang");
  const savedLang = window.localStorage.getItem("openfda-lang");
  const browserLang = navigator.language && navigator.language.toLowerCase().startsWith("ko") ? "ko" : DEFAULT_LANG;
  return SUPPORTED_LANGS.includes(urlLang)
    ? urlLang
    : SUPPORTED_LANGS.includes(savedLang)
      ? savedLang
      : browserLang;
}

const UI_TEXT = {
  en: {
    eyebrow: "CPP country medicine registry search",
    search: "Search",
    searchField: "Search field",
    smart: "Smart",
    brandProduct: "Brand / product",
    ingredient: "Ingredient",
    ndcCode: "NDC / EMA No.",
    company: "Company",
    marketingCategory: "Marketing category",
    all: "All",
    limit: "Limit",
    sort: "Sort",
    relevance: "Relevance",
    productName: "Product name",
    date: "Date",
    hideWeak: "Hide weak matches",
    results: "results",
    previous: "Previous",
    next: "Next",
    score: "Score",
    product: "Product",
    detail: "Detail",
    sourceLimits: "Check guidance",
    manualRequired: "Check in the official portal",
    manualShort: "Manual",
    defaultStatusTitle: "Enter a search term.",
    defaultStatusDetail: "Choose a country/source, then search by product, ingredient, code, or company.",
    resultsPlaceholder: "Search results will appear here.",
    searchTerm: "Search: {query}",
    searching: "Searching: {query}",
    searchingShort: "Searching...",
    sourceLoading: "{source} data is loading.",
    searchFailedTitle: "Search failed",
    searchFailedDetail: "Try a simpler query or wait a moment before searching again.",
    dataCouldNotLoad: "{source} data could not be loaded.",
    application: "Application",
    usStatus: "openFDA returned {total} matches; showing {shown} on this page.",
    euStatus: "EMA returned {total} authorised centralised matches; showing {shown} on this page.",
    frStatus: "France BDPM returned {total} active commercialised matches; showing {shown} on this page.",
    ukStatus: "MHRA returned {total} medicine document matches; showing {shown} on this page. Legal supply category is not structured in this result.",
    deTitle: "Manual verification source",
    deDetail: "Search term: {query}. Use the AMIce portal linked in Source limits above.",
    jpStatus: "PMDA product-name index returned {total} matches; showing {shown} on this page.",
    jpNoMatchTitle: "No PMDA product-name match",
    jpNoMatchDetail: "Search term: {query}. Try a Japanese product name or use PMDA search from Source limits.",
    jpOfficialFieldTitle: "Official PMDA field search",
    jpOfficialFieldDetail: "PMDA supports {field} search in the official portal, but this app currently automates only the product-name suggestion index. Search term: {query}.",
    packages: "Packages",
    regulatory: "Regulatory",
    label: "Label",
    dataset: "Dataset",
    indication: "Indication",
    presentations: "Presentations",
    supply: "Supply",
    document: "Document",
    context: "Context",
    pmdaIndex: "PMDA Index",
    verification: "Verification",
    caveat: "Caveat",
    more: "more",
    updated: "Updated",
    loaded: "Loaded",
    builtBy: "Built by"
  },
  ko: {
    eyebrow: "CPP 국가 의약품 등록 검색",
    search: "검색",
    searchField: "검색 필드",
    smart: "스마트",
    brandProduct: "브랜드 / 제품명",
    ingredient: "성분명",
    ndcCode: "NDC / EMA 번호",
    company: "회사",
    marketingCategory: "마케팅 카테고리",
    all: "전체",
    limit: "표시 개수",
    sort: "정렬",
    relevance: "관련도",
    productName: "제품명",
    date: "날짜",
    hideWeak: "약한 매칭 숨기기",
    results: "결과",
    previous: "이전",
    next: "다음",
    score: "점수",
    product: "제품",
    detail: "상세",
    sourceLimits: "확인 안내",
    manualRequired: "공식 포털에서 확인하세요",
    manualShort: "수동",
    defaultStatusTitle: "검색어를 입력하세요.",
    defaultStatusDetail: "국가/소스를 선택한 뒤 제품명, 성분명, 코드 또는 회사명으로 검색하세요.",
    resultsPlaceholder: "검색 결과가 여기에 표시됩니다.",
    searchTerm: "검색어: {query}",
    searching: "검색 중: {query}",
    searchingShort: "검색 중...",
    sourceLoading: "{source} 데이터를 불러오는 중입니다.",
    searchFailedTitle: "검색 실패",
    searchFailedDetail: "검색어를 단순하게 바꾸거나 잠시 뒤 다시 시도하세요.",
    dataCouldNotLoad: "{source} 데이터를 불러오지 못했습니다.",
    application: "신청/허가번호",
    usStatus: "openFDA에서 {total}건을 찾았고, 이 페이지에 {shown}건을 표시합니다.",
    euStatus: "EMA 중앙허가 데이터에서 {total}건을 찾았고, 이 페이지에 {shown}건을 표시합니다.",
    frStatus: "France BDPM에서 유효/판매 중인 {total}건을 찾았고, 이 페이지에 {shown}건을 표시합니다.",
    ukStatus: "MHRA 문서 검색에서 {total}건을 찾았고, 이 페이지에 {shown}건을 표시합니다. 판매 구분은 구조화 필드로 제공되지 않습니다.",
    deTitle: "수동 확인 소스",
    deDetail: "검색어: {query}. 위 데이터 한계 카드의 AMIce 포털에서 직접 확인하세요.",
    jpStatus: "PMDA 제품명 색인에서 {total}건을 찾았고, 이 페이지에 {shown}건을 표시합니다.",
    jpNoMatchTitle: "PMDA 제품명 매칭 없음",
    jpNoMatchDetail: "검색어: {query}. 일본어 제품명을 시도하거나 위 데이터 한계 카드의 PMDA 검색을 사용하세요.",
    jpOfficialFieldTitle: "PMDA 공식 필드 검색",
    jpOfficialFieldDetail: "PMDA 공식 포털은 {field} 검색을 지원하지만, 이 앱은 현재 제품명 자동완성 색인만 자동화합니다. 검색어: {query}.",
    packages: "패키지",
    regulatory: "허가/규제",
    label: "라벨",
    dataset: "데이터셋",
    indication: "효능/용도",
    presentations: "포장/프레젠테이션",
    supply: "판매/공급",
    document: "문서",
    context: "맥락",
    pmdaIndex: "PMDA 색인",
    verification: "확인",
    caveat: "주의",
    more: "개 더 보기",
    updated: "업데이트",
    loaded: "불러온 날짜",
    builtBy: "제작"
  }
};

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
    note: "Germany AMIce results should be confirmed in the official BfArM portal.",
    placeholder: "Example: ibuprofen, aspirin, nurofen, Zul.-Nr.",
    empty: "AMIce is an official web search portal. This app cannot reliably import its result table, so confirm German product names, ingredients, companies, authorisation numbers, and register status directly in AMIce.",
    codeHeader: "Zul.-Nr.",
    formHeader: "Register",
    dateSortLabel: "Updated",
    detailButton: "AMIce",
    manualUrl: "https://portal.dimdi.de/amguifree/?accessid=amis_off_am_ppv&lang=de",
    manualLabel: "Open AMIce Public Part",
    manualOnly: true,
    searchDisabled: true,
    warnings: [
      "Why direct confirmation is needed: AMIce does not provide a stable public result feed that this app can import.",
      "Search tip: company names may appear under local German entities or older company names."
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
  badge: "Manual PMDA portal",
  note: "Japan PMDA results should be confirmed in the official PMDA portal.",
  placeholder: "Example: EVE, Bufferin, Loxonin, Allegra, ibuprofen",
  empty: "PMDA shows product names, ingredients, companies, risk categories, and package inserts inside its official search screen. This app cannot reliably import the full result table, so confirm Japan entries directly in PMDA.",
  codeHeader: "PMDA",
  formHeader: "Index",
  dateSortLabel: "Loaded",
  detailButton: "PMDA",
  manualUrl: "https://www.pmda.go.jp/PmdaSearch/otcSearch/",
  manualLabel: "Open PMDA OTC search",
  manualOnly: true,
  searchDisabled: true,
  warnings: [
    "Why direct confirmation is needed: PMDA exposes only limited product-name hints outside the portal, not the full ingredient/company/risk-category result table.",
    "Search tip: Japanese product or ingredient names are the most reliable; English or Romanized names are useful only as hints."
  ]
};

const SOURCE_I18N = {
  us: {
    label: { en: "US OTC", ko: "미국 OTC" },
    note: { en: "United States OTC products from openFDA NDC Directory.", ko: "미국 openFDA NDC Directory에 등록된 OTC 제품입니다." },
    placeholder: { en: "Example: advil, aspirin, acetaminophen, 0573-0147", ko: "예: advil, aspirin, acetaminophen, 0573-0147" },
    empty: { en: "No matching US OTC products.", ko: "일치하는 미국 OTC 제품이 없습니다." },
    formHeader: { en: "Form", ko: "제형" },
    dateSortLabel: { en: "Listing expiration", ko: "등재 만료일" },
    detailButton: { en: "Detail", ko: "상세" },
    warnings: {
      en: SOURCES.us.warnings,
      ko: [
        "openFDA NDC에서 HUMAN OTC DRUG 및 finished:true인 항목만 검색합니다.",
        "CPP 최종 검토는 최신 라벨, monograph/NDA/ANDA 상태, 판매 상태를 별도로 확인하세요."
      ]
    }
  },
  uk: {
    label: { en: "UK MHRA", ko: "영국 MHRA" },
    note: { en: "United Kingdom MHRA Products document search by product, active substance, or Product Licence number.", ko: "영국 MHRA Products 문서를 제품명, 성분명 또는 Product Licence 번호로 검색합니다." },
    placeholder: { en: "Example: advil, nurofen, ibuprofen, PL 00327/0197", ko: "예: advil, nurofen, ibuprofen, PL 00327/0197" },
    empty: { en: "No matching UK MHRA medicine documents.", ko: "일치하는 영국 MHRA 문서가 없습니다." },
    codeHeader: { en: "PL No.", ko: "PL 번호" },
    formHeader: { en: "Document", ko: "문서" },
    dateSortLabel: { en: "Document date", ko: "문서 날짜" },
    warnings: {
      en: SOURCES.uk.warnings,
      ko: [
        "결과는 SmPC/PIL/PAR 중심의 문서 검색이며, 깔끔한 제품 마스터 테이블은 아닙니다.",
        "P/GSL/POM 판매 구분은 구조화 필드로 제공되지 않으므로 연결된 SmPC/PIL에서 확인하세요."
      ]
    }
  },
  fr: {
    label: { en: "France BDPM", ko: "프랑스 BDPM" },
    note: { en: "France national medicines register from BDPM.", ko: "프랑스 BDPM 국가 의약품 등록 데이터입니다." },
    placeholder: { en: "Example: advil, nurofen, doliprane, ibuprofene, 68634000", ko: "예: advil, nurofen, doliprane, ibuprofene, 68634000" },
    empty: { en: "No matching France BDPM medicines.", ko: "일치하는 프랑스 BDPM 의약품이 없습니다." },
    codeHeader: { en: "CIS / CIP", ko: "CIS / CIP" },
    formHeader: { en: "Form", ko: "제형" },
    dateSortLabel: { en: "AMM date", ko: "AMM 날짜" },
    warnings: {
      en: SOURCES.fr.warnings,
      ko: [
        "CPD 제한 조건이 등록된 경우 함께 표시합니다.",
        "CPD 제한이 없다는 점은 참고 신호일 뿐, 자동으로 OTC임을 의미하지는 않습니다."
      ]
    }
  },
  de: {
    label: { en: "Germany AMIce", ko: "독일 AMIce" },
    badge: { en: "Manual portal", ko: "수동 포털" },
    note: { en: "Germany AMIce results should be confirmed in the official BfArM portal.", ko: "독일 AMIce 결과는 공식 BfArM 포털에서 확인합니다." },
    placeholder: { en: "Example: ibuprofen, aspirin, nurofen, Zul.-Nr.", ko: "예: ibuprofen, aspirin, nurofen, Zul.-Nr." },
    empty: { en: "AMIce is an official web search portal. This app cannot reliably import its result table, so confirm German product names, ingredients, companies, authorisation numbers, and register status directly in AMIce.", ko: "AMIce는 공식 웹사이트 화면에서 조회하는 포털입니다. 이 앱이 결과표를 안정적으로 가져올 수 없기 때문에, 독일 제품명, 성분명, 회사명, 허가번호, 등록 상태는 AMIce에서 직접 확인하세요." },
    codeHeader: { en: "Zul.-Nr.", ko: "Zul.-Nr." },
    formHeader: { en: "Register", ko: "등록" },
    dateSortLabel: { en: "Updated", ko: "업데이트" },
    manualLabel: { en: "Open AMIce Public Part", ko: "AMIce Public Part 열기" },
    warnings: {
      en: SOURCES.de.warnings,
      ko: [
        "직접 확인이 필요한 이유: AMIce는 이 앱이 결과표를 가져올 수 있는 안정적인 공개 연결 방식을 제공하지 않습니다.",
        "검색 팁: 회사명은 독일 현지 법인명이나 이전 회사명으로 표시될 수 있습니다."
      ]
    }
  },
  jp: {
    label: { en: "Japan PMDA", ko: "일본 PMDA" },
    badge: { en: "Manual PMDA portal", ko: "PMDA 수동 포털" },
    note: { en: "Japan PMDA results should be confirmed in the official PMDA portal.", ko: "일본 PMDA 결과는 공식 PMDA 포털에서 확인합니다." },
    placeholder: { en: "Example: EVE, Bufferin, Loxonin, Allegra, ibuprofen", ko: "예: EVE, Bufferin, Loxonin, Allegra, ibuprofen" },
    empty: { en: "PMDA shows product names, ingredients, companies, risk categories, and package inserts inside its official search screen. This app cannot reliably import the full result table, so confirm Japan entries directly in PMDA.", ko: "PMDA는 제품명, 성분명, 회사명, 리스크 구분, 첨부문서를 공식 검색 화면 안에서 보여줍니다. 이 앱이 전체 결과표를 안정적으로 가져올 수 없기 때문에, 일본 자료는 PMDA에서 직접 확인하세요." },
    formHeader: { en: "Index", ko: "색인" },
    dateSortLabel: { en: "Loaded", ko: "불러온 날짜" },
    manualLabel: { en: "Open PMDA OTC search", ko: "PMDA OTC 검색 열기" },
    warnings: {
      en: SOURCES.jp.warnings,
      ko: [
        "직접 확인이 필요한 이유: PMDA는 포털 밖에서는 일부 제품명 힌트만 확인 가능하고, 성분명/회사명/리스크 구분 결과표는 공식 화면에서 확인해야 합니다.",
        "검색 팁: PMDA에서는 일본어 제품명이나 성분명이 가장 정확합니다. 영문/로마자 표기는 참고용 힌트로만 사용하세요."
      ]
    }
  },
  eu: {
    label: { en: "EMA Centralized", ko: "EMA 중앙허가" },
    note: { en: "EU centralized medicines from EMA.", ko: "EMA 중앙허가 의약품 데이터입니다." },
    placeholder: { en: "Example: paracetamol, ibuprofen, emedastine, EMEA/H/C/000223", ko: "예: paracetamol, ibuprofen, emedastine, EMEA/H/C/000223" },
    empty: { en: "No matching EU centralized medicines.", ko: "일치하는 EMA 중앙허가 의약품이 없습니다." },
    codeHeader: { en: "EMA No.", ko: "EMA 번호" },
    formHeader: { en: "Group", ko: "그룹" },
    dateSortLabel: { en: "Last updated", ko: "최근 업데이트" },
    warnings: {
      en: SOURCES.eu.warnings,
      ko: [
        "EMA 중앙허가 의약품만 포함하며, 모든 EU 국가별 OTC 제품을 포함하지는 않습니다.",
        "OTC/판매 구분은 직접 표시되지 않으므로 국가별 등록 상태를 별도로 확인하세요."
      ]
    }
  }
};

const state = {
  source: "us",
  lang: initialLanguage(),
  query: "",
  page: 1,
  total: 0,
  rows: [],
  rawItems: [],
  lastSearchUrl: "",
  manualNotice: null,
  labelCache: new Map()
};

const els = {
  form: document.getElementById("searchForm"),
  keyword: document.getElementById("keyword"),
  controlGrid: document.querySelector(".control-grid"),
  languageButtons: document.querySelectorAll("[data-lang]"),
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
  statusBar: document.querySelector(".status-bar"),
  statusTitle: document.getElementById("statusTitle"),
  statusDetail: document.getElementById("statusDetail"),
  resultCount: document.getElementById("resultCount"),
  resultsToolbar: document.querySelector(".results-toolbar"),
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

function t(key, values = {}) {
  const bundle = UI_TEXT[state.lang] || UI_TEXT.en;
  const fallback = UI_TEXT.en[key] || key;
  return (bundle[key] || fallback).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function localized(value) {
  if (Array.isArray(value)) return value.map((entry) => localized(entry));
  if (value && typeof value === "object") return value[state.lang] || value.en || "";
  return value;
}

function numberText(value) {
  return Number(value || 0).toLocaleString(state.lang === "ko" ? "ko-KR" : "en-US");
}

function applySourceTranslations() {
  Object.entries(SOURCE_I18N).forEach(([sourceKey, copy]) => {
    const source = SOURCES[sourceKey];
    if (!source) return;
    Object.entries(copy).forEach(([field, value]) => {
      source[field] = localized(value);
    });
  });
}

function setSelectText(select, labels) {
  Object.entries(labels).forEach(([value, label]) => {
    const option = select.querySelector(`option[value="${value}"]`);
    if (option) option.textContent = label;
  });
}

function applyStaticLanguage() {
  document.documentElement.lang = state.lang === "ko" ? "ko" : "en";
  document.querySelector(".eyebrow").textContent = t("eyebrow");
  els.sourceTabs.forEach((tab) => {
    const config = SOURCES[tab.dataset.source];
    if (config) tab.textContent = config.label;
  });
  document.getElementById("searchLabel").textContent = t("search");
  document.getElementById("searchButton").textContent = t("search");
  document.getElementById("searchModeLabel").textContent = t("searchField");
  document.getElementById("categoryFilterLabel").textContent = t("marketingCategory");
  document.getElementById("resultLimitLabel").textContent = t("limit");
  document.getElementById("sortModeLabel").textContent = t("sort");
  document.getElementById("strictModeLabel").textContent = t("hideWeak");
  document.getElementById("resultsLabel").textContent = t("results");
  document.getElementById("prevPage").textContent = t("previous");
  document.getElementById("nextPage").textContent = t("next");
  document.querySelector(".score-col").textContent = t("score");
  document.getElementById("productHeader").textContent = t("product");
  document.getElementById("ingredientHeader").textContent = t("ingredient");
  document.getElementById("companyHeader").textContent = t("company");
  document.getElementById("detailHeader").textContent = t("detail");
  document.querySelector(".app-footer span:nth-child(2)").innerHTML = `${escapeHtml(t("builtBy"))} <strong class="credit-name">Jun</strong>`;

  setSelectText(els.searchMode, {
    smart: t("smart"),
    brand: t("brandProduct"),
    ingredient: t("ingredient"),
    ndc: t("ndcCode"),
    labeler: t("company")
  });
  setSelectText(els.sortMode, {
    relevance: t("relevance"),
    brand: t("productName"),
    labeler: t("company")
  });
  const allOption = els.categoryFilter.querySelector('option[value=""]');
  if (allOption) allOption.textContent = t("all");

  els.languageButtons.forEach((button) => {
    const active = button.dataset.lang === state.lang;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function setLanguage(lang, { run = true } = {}) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === state.lang) return;

  state.lang = lang;
  window.localStorage.setItem("openfda-lang", state.lang);
  applySourceTranslations();
  applyStaticLanguage();
  applySource(state.source, { run: run && Boolean(els.keyword.value.trim()) });
}

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
  url.searchParams.set("lang", state.lang);

  if (state.source === "us") url.searchParams.delete("source");
  else url.searchParams.set("source", state.source);

  window.history.replaceState(null, "", url);
}

function renderEmpty(message) {
  els.tableScroll.hidden = false;
  els.manualResult.hidden = true;
  if (els.resultsToolbar) els.resultsToolbar.classList.remove("is-hidden");
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
      <div class="source-limit-title">${escapeHtml(t("sourceLimits"))}</div>
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
  if (els.resultsToolbar) els.resultsToolbar.classList.remove("is-hidden");
  els.resultsBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">
        ${escapeHtml(config.empty)}
      </td>
    </tr>
  `;
}

function renderManualSource(config) {
  els.resultCount.textContent = t("manualShort");
  els.tableScroll.hidden = true;
  els.manualResult.hidden = false;
  if (els.resultsToolbar) els.resultsToolbar.classList.add("is-hidden");
  els.manualResult.innerHTML = `
    <div class="manual-card">
      <div>
        <strong>${escapeHtml(t("manualRequired"))}</strong>
        <p>${escapeHtml(config.empty)}</p>
      </div>
      ${sourceLink(config)}
    </div>
  `;
}

function renderManualNotice(notice) {
  els.resultCount.textContent = t("manualShort");
  els.tableScroll.hidden = true;
  els.manualResult.hidden = false;
  if (els.resultsToolbar) els.resultsToolbar.classList.add("is-hidden");
  els.manualResult.innerHTML = `
    <div class="manual-card">
      <div>
        <strong>${escapeHtml(notice.title || t("manualRequired"))}</strong>
        <p>${escapeHtml(notice.detail || "")}</p>
      </div>
      ${notice.url ? `<a class="inline-link" href="${escapeHtml(notice.url)}" target="_blank" rel="noreferrer">${escapeHtml(notice.linkLabel || t("manualRequired"))}</a>` : ""}
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
  if (state.manualNotice) {
    renderManualNotice(state.manualNotice);
    return;
  }

  if (config.manualOnly) {
    renderManualSource(config);
    return;
  }

  els.tableScroll.hidden = false;
  els.manualResult.hidden = true;
  if (els.resultsToolbar) els.resultsToolbar.classList.remove("is-hidden");
  const rows = currentRows();
  els.resultCount.textContent = numberText(rows.length);

  if (!rows.length) {
    renderSourceEmpty();
    return;
  }

  els.resultsBody.innerHTML = rows.map((row, index) => {
    const ingredientText = toArray(row.activeIngredients).slice(0, 4).map(escapeHtml).join("<br>");
    const moreIngredients = toArray(row.activeIngredients).length > 4
      ? `<span class="subtext">+${toArray(row.activeIngredients).length - 4} ${escapeHtml(t("more"))}</span>`
      : "";
    const packageText = toArray(row.packageNdcs).slice(0, 2).map(escapeHtml).join("<br>") || "N/A";
    const packageMore = toArray(row.packageNdcs).length > 2
      ? `<br><span class="subtext">+${toArray(row.packageNdcs).length - 2} ${escapeHtml(t("more"))}</span>`
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
          <div class="subtext">${escapeHtml(t("application"))}: ${escapeHtml(row.applicationNumber)}</div>
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
  if (state.manualNotice || SOURCES[state.source].manualOnly) {
    els.pageLabel.textContent = t("manualShort");
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
  if (data.meta?.last_updated) els.apiDate.textContent = `${t("updated")} ${data.meta.last_updated}`;

  setStatus(
    t("searchTerm", { query: escapeHtml(query) }),
    t("usStatus", { total: numberText(total), shown: numberText(items.length) })
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
  if (data.meta?.timestamp) els.apiDate.textContent = `${t("updated")} ${data.meta.timestamp.slice(0, 10)}`;

  setStatus(
    t("searchTerm", { query: escapeHtml(query) }),
    t("euStatus", { total: numberText(total), shown: numberText(items.length) })
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
  if (data.meta?.loadedAt) els.apiDate.textContent = `${t("loaded")} ${data.meta.loadedAt.slice(0, 10)}`;

  setStatus(
    t("searchTerm", { query: escapeHtml(query) }),
    t("frStatus", { total: numberText(total), shown: numberText(items.length) })
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
    t("searchTerm", { query: escapeHtml(query) }),
    t("ukStatus", { total: numberText(total), shown: numberText(items.length) })
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
    t("deTitle"),
    t("deDetail", { query: escapeHtml(query) })
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
  state.manualNotice = null;
  if (data.meta?.loadedAt) els.apiDate.textContent = `${t("loaded")} ${data.meta.loadedAt.slice(0, 10)}`;

  if (data.meta?.accessMode === "manual-field") {
    const fieldKey = data.meta.field || els.searchMode.value;
    const field = fieldKey === "ingredient"
      ? t("ingredient")
      : fieldKey === "company"
        ? t("company")
        : t("ndcCode");
    const detail = t("jpOfficialFieldDetail", {
      field,
      query
    });
    const safeDetail = t("jpOfficialFieldDetail", {
      field: escapeHtml(field),
      query: escapeHtml(query)
    });
    state.manualNotice = {
      title: t("jpOfficialFieldTitle"),
      detail,
      url: SOURCES.jp.manualUrl,
      linkLabel: SOURCES.jp.manualLabel
    };
    setStatus(t("jpOfficialFieldTitle"), safeDetail);
    return;
  }

  if (total) {
    setStatus(
      t("searchTerm", { query: escapeHtml(query) }),
      t("jpStatus", { total: numberText(total), shown: numberText(items.length) })
    );
  } else {
    setStatus(
      t("jpNoMatchTitle"),
      t("jpNoMatchDetail", { query: escapeHtml(query) })
    );
  }
}

async function runSearch({ page = 1, broad = false } = {}) {
  const config = SOURCES[state.source];
  if (config.searchDisabled) {
    state.query = "";
    state.page = 1;
    state.total = 0;
    state.rows = [];
    state.rawItems = [];
    state.manualNotice = null;
    els.resultCount.textContent = t("manualShort");
    renderPager();
    renderManualSource(config);
    syncUrlQuery("");
    return;
  }

  const query = els.keyword.value.trim();
  if (!query) {
    state.query = "";
    state.page = 1;
    state.total = 0;
    state.rows = [];
    state.rawItems = [];
    state.manualNotice = null;
    setStatus(t("defaultStatusTitle"), t("defaultStatusDetail"));
    els.resultCount.textContent = numberText(0);
    renderPager();
    if (config.manualOnly) renderManualSource(config);
    else renderEmpty(t("resultsPlaceholder"));
    syncUrlQuery("");
    return;
  }

  state.query = query;
  state.page = page;
  state.manualNotice = null;
  syncUrlQuery(query);
  showError("");
  setStatus(
    t("searching", { query: escapeHtml(query) }),
    t("sourceLoading", { source: escapeHtml(SOURCES[state.source].label) })
  );
  els.resultsBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="7" class="empty-state">${escapeHtml(t("searchingShort"))}</td>
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
    state.manualNotice = null;
    setStatus(t("searchFailedTitle"), t("searchFailedDetail"));
    showError(error.message);
    renderPager();
    renderEmpty(t("dataCouldNotLoad", { source: SOURCES[state.source].label }));
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
        <div>This app automates PMDA's product-name suggestion index only.</div>
      </div>
      <div class="detail-block">
        <strong>Required verification</strong>
        <div>Use the official PMDA portal for ingredient, company, risk category, and package-insert searches.</div>
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
      <div>PMDA's product-name index confirms the name is in the OTC/guidance-required search surface. Ingredient, company, risk category, and package-insert fields should still be verified in the official PMDA portal.</div>
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
    titles[0].textContent = t("dataset");
    titles[1].textContent = t("regulatory");
    titles[2].textContent = t("indication");
    return;
  }

  if (row.source === "fr") {
    titles[0].textContent = t("presentations");
    titles[1].textContent = t("regulatory");
    titles[2].textContent = t("supply");
    return;
  }

  if (row.source === "uk") {
    titles[0].textContent = t("document");
    titles[1].textContent = t("regulatory");
    titles[2].textContent = t("context");
    return;
  }

  if (row.source === "jp") {
    titles[0].textContent = t("pmdaIndex");
    titles[1].textContent = t("verification");
    titles[2].textContent = t("caveat");
    return;
  }

  titles[0].textContent = t("packages");
  titles[1].textContent = t("regulatory");
  titles[2].textContent = t("label");
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
  const searchDisabled = Boolean(config.searchDisabled);

  els.sourceTabs.forEach((tab) => {
    const active = tab.dataset.source === state.source;
    const tabConfig = SOURCES[tab.dataset.source];
    if (tabConfig) tab.textContent = tabConfig.label;
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
  els.form.classList.toggle("is-hidden", searchDisabled);
  els.controlGrid.classList.toggle("is-hidden", searchDisabled);
  if (els.statusBar) els.statusBar.classList.toggle("is-hidden", searchDisabled);
  els.keyword.disabled = searchDisabled;
  els.searchMode.disabled = searchDisabled;
  els.resultLimit.disabled = searchDisabled;
  els.sortMode.disabled = searchDisabled;
  els.strictMode.disabled = searchDisabled;
  els.categoryControl.classList.toggle("is-hidden", state.source !== "us");
  els.categoryFilter.disabled = state.source !== "us" || searchDisabled;
  els.sortMode.querySelector('option[value="expiration"]').textContent = config.dateSortLabel;

  state.page = 1;
  state.total = 0;
  state.rows = [];
  state.rawItems = [];
  state.manualNotice = null;
  showError("");
  if (!searchDisabled) setStatus(t("defaultStatusTitle"), config.note);
  renderPager();
  if (config.manualOnly) renderManualSource(config);
  else renderEmpty(t("resultsPlaceholder"));
  syncUrlQuery(searchDisabled ? "" : els.keyword.value.trim());

  if (!searchDisabled && run && els.keyword.value.trim()) runSearch({ page: 1 });
}

els.languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.lang);
  });
});

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
applySourceTranslations();
applyStaticLanguage();
applySource(initialSource);

if (initialQuery && !SOURCES[state.source].searchDisabled) {
  els.keyword.value = initialQuery;
  runSearch({ page: 1 });
} else if (initialQuery) {
  syncUrlQuery("");
}
