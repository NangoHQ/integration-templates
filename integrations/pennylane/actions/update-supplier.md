<!-- BEGIN GENERATED CONTENT -->
# Update Supplier

## General Information

- **Description:** Action to update a supplier in pennylane

- **Version:** 1.0.1
- **Group:** Suppliers
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/update-supplier.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /suppliers`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "source_id": "<string>",
  "name?": "<string>",
  "reg_no?": "<string>",
  "address?": "<string>",
  "postal_code?": "<string>",
  "city?": "<string>",
  "country_alpha2?": "<string>",
  "recipient?": "<string>",
  "vat_number?": "<string>",
  "emails?": [
    "<string>"
  ],
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-supplier.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-supplier.md)

<!-- END  GENERATED CONTENT -->

