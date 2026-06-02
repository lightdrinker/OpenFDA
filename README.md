# OpenFDA

OpenFDA is a small registry search app for CPP-country medicine checks.

## Data Sources

- US OTC: `https://api.fda.gov/drug/ndc.json`
- US Drug Label details: `https://api.fda.gov/drug/label.json`
- France BDPM: `https://base-donnees-publique.medicaments.gouv.fr/telechargement`
- EU Centralized: EMA medicines JSON dataset
  - `https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json`

US search filters `product_type:"HUMAN OTC DRUG"` and `finished:true` by default.

EU search uses EMA centralised-procedure medicines and filters to human, authorised products. EMA data does not directly identify OTC status, so EU results should be treated as authorization evidence and cross-checked against SmPC/PIL or national registers for legal supply status.

France search uses BDPM `CIS_bdpm`, `CIS_COMPO`, `CIS_CIP`, `CIS_CPD`, and `CIS_MITM` files. Results default to active, commercialised products and show CPD restrictions when listed.

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
http://127.0.0.1:8765/?source=fr&q=advil
http://127.0.0.1:8765/?source=eu&q=emedastine
```
