# Update Product

## General Information

- **Description:** Action to update a product in pennylane

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/update-product.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/products`
- **Method:** `PATCH`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "source_id": "<string>",
  "label?": "<string>",
  "description?": "<string>",
  "unit?": "<string>",
  "price_before_tax?": "<number>",
  "price?": "<number>",
  "vat_rate?": "<string>",
  "currency?": "<string>",
  "reference?": "<string | null>",
  "substance?": "<string | null>"
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "source_id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-product.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-product.md)
