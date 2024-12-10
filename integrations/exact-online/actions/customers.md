# Customers

## General Information
- **Description:** Fetches all customers in Exact Online

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/exact-online/syncs/customers.ts)

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
  "division": "<number | null>",
  "name": "<string>",
  "email": "<string | null>",
  "taxNumber": "<string | null>",
  "addressLine1": "<string | null>",
  "addressLine2": "<string | null>",
  "city": "<string | null>",
  "zip": "<string | null>",
  "country": "<string | null>",
  "state": "<string | null>",
  "phone": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/syncs/customers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/syncs/customers.md)

<!-- END  GENERATED CONTENT -->

undefined