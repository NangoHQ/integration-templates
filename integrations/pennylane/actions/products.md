# Products

## General Information
- **Description:** Fetches a list products from pennylane

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: accounting
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/syncs/products.ts)

### Request Endpoint

- **Path:** `/products`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "source_id": "<string>",
  "label": "<string>",
  "description?": "<string>",
  "unit": "<string>",
  "price_before_tax?": "<number>",
  "price": "<number>",
  "vat_rate": "<string>",
  "currency": "<string>",
  "reference?": "<string | null>",
  "substance?": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/products.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/products.md)

<!-- END  GENERATED CONTENT -->

undefined