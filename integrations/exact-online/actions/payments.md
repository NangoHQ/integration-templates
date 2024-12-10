# Payments

## General Information
- **Description:** Fetches all payments in Exact Online

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/exact-online/syncs/payments.ts)

### Request Endpoint

- **Path:** `/payments`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "description": "<string | null>",
  "division": "<number | null>",
  "customerId": "<string | null>",
  "amount": "<number | null>",
  "createdAt": "<string | null>",
  "currency": "<string | null>",
  "journal": "<string | null>",
  "paymentMethod": "<string | null>",
  "paymentReference": "<string | null>",
  "status": "<number | null>",
  "transactionID": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/syncs/payments.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/syncs/payments.md)

<!-- END  GENERATED CONTENT -->

undefined