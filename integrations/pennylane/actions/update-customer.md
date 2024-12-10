# Update Customer

## General Information

- **Description:** Action to update a supplier in pennylane

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/update-customer.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/customers`
- **Method:** `PATCH`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "first_name?": "<string>",
  "last_name?": "<string>",
  "gender?": "<string>",
  "address?": "<string>",
  "vat_number?": "<string | null>",
  "postal_code?": "<string | null>",
  "city?": "<string | null>",
  "country_alpha2?": "<string | null>",
  "recipient?": "<string | null>",
  "source_id?": "<string | null>",
  "emails?": "<string[] | null>",
  "billing_iban?": "<string | null>",
  "delivery_address?": "<DeliveryAddressObject | null>",
  "delivery_postal_code?": "<string | null>",
  "delivery_country?": "<string | null>",
  "delivery_country_alpha2?": "<string | null>",
  "payment_conditions?": "<string | null>",
  "phone?": "<string | null>",
  "reference?": "<string | null>",
  "notes?": "<string | null>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-customer.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-customer.md)
