# Suppliers

## General Information
- **Description:** Fetches a list of suppliers from pennylane

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: supplier_invoices
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/syncs/suppliers.ts)

### Request Endpoint

- **Path:** `/suppliers`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "name": "<string>",
  "id?": "<string>",
  "reg_no?": "<string>",
  "address": "<string>",
  "postal_code": "<string>",
  "city": "<string>",
  "country_alpha2": "<string>",
  "recipient?": "<string>",
  "vat_number?": "<string>",
  "source_id?": "<string>",
  "emails": [
    "<string>"
  ],
  "iban?": "<string>",
  "payment_conditions?": "<string>",
  "phone?": "<string>",
  "reference?": "<string>",
  "notes?": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/suppliers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/suppliers.md)

<!-- END  GENERATED CONTENT -->

undefined