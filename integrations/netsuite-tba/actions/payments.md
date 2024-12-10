# Payments

## General Information
- **Description:** Fetches all payments received from customers in Netsuite

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/syncs/payments.ts)

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
  "description?": "<string>",
  "customerId": "<string | null>",
  "amount": "<number | null>",
  "createdAt": "<string | null>",
  "currency": "<string | null>",
  "paymentReference": "<string | null>",
  "status": "<string | null>",
  "applyTo": [
    "<string>"
  ]
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/payments.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/payments.md)

<!-- END  GENERATED CONTENT -->

undefined