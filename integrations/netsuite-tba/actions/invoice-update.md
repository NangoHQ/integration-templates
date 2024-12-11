# Invoice Update

## General Information

- **Description:** Updates an invoice in Netsuite

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/invoice-update.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/invoices`
- **Method:** `PUT`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "customerId": "<string>",
  "currency": "<string>",
  "description?": "<string>",
  "status": "<string>",
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
  "id": "<string>",
  "customerId?": "<string>",
  "locationId?": "<string>",
  "currency?": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/invoice-update.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/invoice-update.md)

<!-- END  GENERATED CONTENT -->

