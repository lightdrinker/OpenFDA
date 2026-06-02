# OpenFDA

미국 openFDA NDC Directory를 이용해 현재 등록된 OTC 제품을 검색하는 정적 웹앱입니다.

## 실행

`index.html`을 브라우저에서 열면 됩니다. 별도 빌드 과정은 없습니다.

검색어를 URL에 붙여 바로 열 수도 있습니다.

```txt
index.html?q=advil
```

## 데이터 소스

- NDC Directory: `https://api.fda.gov/drug/ndc.json`
- Drug Label: `https://api.fda.gov/drug/label.json`

검색은 `product_type:"HUMAN OTC DRUG"`와 `finished:true`를 기본으로 붙입니다. 상세 영역의 Drug Label은 제품을 펼칠 때만 추가로 조회합니다.
