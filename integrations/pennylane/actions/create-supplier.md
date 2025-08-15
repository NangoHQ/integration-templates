<!-- BEGIN GENERATED CONTENT -->
# Create Supplier

## General Information

- **Description:** Action to create a supplier in pennylane
- **Version:** 2.0.0
- **Group:** Suppliers
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_pennylane_createsupplier`
- **Input Model:** `ActionInput_pennylane_createsupplier`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/create-supplier.ts)


## Endpoint Reference

### Request Endpoint

`POST /suppliers`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "reg_no?": "<string>",
  "address": "<string>",
  "postal_code": "<string>",
  "city": "<string>",
  "country_alpha2": "<string>",
  "recipient?": "<string>",
  "vat_number?": "<string>",
  "source_id?": "<string>",
  "emails": "<string[]>",
  "iban?": "<string>",
  "payment_conditions?": "<string>",
  "phone?": "<string>",
  "reference?": "<string>",
  "notes?": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-supplier.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-supplier.md)

<!-- END  GENERATED CONTENT -->

