const AMICE_PORTAL_URL = "https://portal.dimdi.de/amguifree/?accessid=amis_off_am_ppv&lang=de";
const BFARM_INFO_URL = "https://www.bfarm.de/EN/Medicinal-products/Information-on-medicinal-products/Research-medicinal-products/AMIce/Database-description-medicinal-products/_artikel.html?nn=986784";

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

  const url = new URL(request.url || "/", `https://${request.headers.host || "localhost"}`);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  sendJson(response, 200, {
    meta: {
      source: "BfArM AMIce Public Part",
      sourceUrl: AMICE_PORTAL_URL,
      infoUrl: BFARM_INFO_URL,
      accessMode: "manual",
      results: { total: 0, limit, skip },
      notice: "BfArM AMIce Public Part is the official German medicinal products register, but no stable JSON/API search endpoint is available from this app. Use the official portal for manual verification."
    },
    results: []
  });
};
