# Invoices

## General Information
- **Description:** Fetches all invoices in Netsuite

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/syncs/invoices.ts)

### Request Endpoint

- **Path:** `/invoices`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "customerId": "<string>",
  "currency": "<string>",
  "description": "<string | null>",
  "createdAt": "<string>",
  "lines": [
    {
      "itemId": "<string>",
      "quantity": "<number>",
      "amount": "<number>",
      "vatCode?": "<string>",
      "description?": "<string>",
      "locationId?": "<string>"
    }
  ],
  "total": "<number>",
  "status": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/invoices.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/invoices.md)

<!-- END  GENERATED CONTENT -->

undefined