# Create Customer

## General Information

- **Description:** Action to create a customer in pennylane

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/create-customer.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/customers`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "customer_type?": "<string>",
  "first_name": "<string>",
  "last_name": "<string>",
  "country_alpha2": "<string>",
  "gender?": "<string | null>",
  "address?": "<string>",
  "postal_code?": "<string>",
  "city?": "<string>",
  "source_id?": "<string>",
  "emails?": [
    "<string>"
  ],
  "billing_iban?": "<string>",
  "delivery_address?": "<string | DeliveryAddressObject>",
  "vat_number?": "<string | null>",
  "delivery_postal_code?": "<string>",
  "delivery_city?": "<string>",
  "delivery_country_alpha2?": "<string>",
  "payment_conditions?": "<string>",
  "phone?": "<string>",
  "reference?": "<string>",
  "notes?": "<string>",
  "mandate?": {
    "provider?": "<string>",
    "source_id": "<string>"
  },
  "plan_item?": {
    "number?": "<string>",
    "label?": "<string>",
    "enabled?": "<boolean>",
    "vat_rate?": "<string>",
    "country_alpha2?": "<string>",
    "description?": "<string>"
  }
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-customer.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-customer.md)

<!-- END  GENERATED CONTENT -->

