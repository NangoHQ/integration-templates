# Customers

## General Information
- **Description:** Fetches a list of customers from pennylane

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: accounting
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/syncs/customers.ts)

### Request Endpoint

- **Path:** `/customers`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

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
  "delivery_country_alpha2?": "<string | null>",
  "payment_conditions?": "<string | null>",
  "phone?": "<string | null>",
  "reference?": "<string | null>",
  "notes?": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/customers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/customers.md)

<!-- END  GENERATED CONTENT -->

undefined