<!-- BEGIN GENERATED CONTENT -->
# Create Product

## General Information

- **Description:** Action to create a product in pennylane

- **Version:** 1.0.1
- **Group:** Products
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `PennylaneSuccessResponse`
- **Input Model:** `CreateProduct`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/create-product.ts)


## Endpoint Reference

### Request Endpoint

`POST /products`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
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

### Request Response

```json
{
  "success": "<boolean>",
  "source_id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-product.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-product.md)

<!-- END  GENERATED CONTENT -->

