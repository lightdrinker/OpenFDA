# OpenFDA

OpenFDA is a small registry search app for CPP-country medicine checks.

## Data Sources

- US OTC: `https://api.fda.gov/drug/ndc.json`
- US Drug Label details: `https://api.fda.gov/drug/label.json`
- UK MHRA Products: `https://products.mhra.gov.uk/`
- France BDPM: `https://base-donnees-publique.medicaments.gouv.fr/telechargement`
- Germany AMIce Public Part: `https://portal.dimdi.de/amguifree/?accessid=amis_off_am_ppv&lang=de`
- Japan PMDA OTC/BTC package-insert product-name index:
  - `https://www.pmda.go.jp/PmdaSearch/otcSearch/`
  - `https://www.pmda.go.jp/PmdaSearch/js/data/otc/list_n.lib`
- EU Centralized: EMA medicines JSON dataset
  - `https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json`

US search filters `product_type:"HUMAN OTC DRUG"` and `finished:true` by default.

EU search uses EMA centralised-procedure medicines and filters to human, authorised products. EMA data does not directly identify OTC status, so EU results should be treated as authorization evidence and cross-checked against SmPC/PIL or national registers for legal supply status.

France search uses BDPM `CIS_bdpm`, `CIS_COMPO`, `CIS_CIP`, `CIS_CPD`, and `CIS_MITM` files. Results default to active, commercialised products and show CPD restrictions when listed.

UK search uses the MHRA Products search index and returns medicine documents such as SmPC, PIL, and PAR records. It can search by product, active substance, or Product Licence number, but legal supply category is not returned as a structured field.

Germany AMIce Public Part is the official public German register. AMIce works as an official web search portal, and the app cannot reliably import its result table. Germany is therefore presented as an official-portal verification tab.

Japan PMDA's official OTC/guidance-required portal supports product-name, ingredient, company, risk-category, and package-insert searches. PMDA exposes only limited product-name hints outside the portal, so Japan is presented as an official-portal verification tab rather than a partial automated search.

## Run Locally

```powershell
node serve.mjs
```

Open:

```txt
http://127.0.0.1:8765/
```

URL search examples:

```txt
http://127.0.0.1:8765/?q=advil
http://127.0.0.1:8765/?source=uk&q=advil
http://127.0.0.1:8765/?source=fr&q=advil
http://127.0.0.1:8765/?source=de
http://127.0.0.1:8765/?source=jp
http://127.0.0.1:8765/?source=eu&q=emedastine
```
