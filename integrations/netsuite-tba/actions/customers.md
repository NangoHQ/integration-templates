# Customers

## General Information
- **Description:** Fetches all customers in Netsuite

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/syncs/customers.ts)

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
  "addressLine1": "<string | null>",
  "addressLine2": "<string | null>",
  "city": "<string | null>",
  "zip": "<string | null>",
  "country": "<string | null>",
  "state": "<string | null>",
  "id": "<string>",
  "externalId": "<string | null>",
  "name": "<string>",
  "email": "<string | null>",
  "taxNumber": "<string | null>",
  "phone": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/customers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/customers.md)

<!-- END  GENERATED CONTENT -->

undefined