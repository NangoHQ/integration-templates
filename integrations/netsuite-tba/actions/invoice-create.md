# Invoice Create

## General Information

- **Description:** Creates an invoice in Netsuite

- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/invoice-create.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/invoices`
- **Method:** `POST`

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
  ]
}
```

### Request Response

```json
{
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/invoice-create.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/invoice-create.md)

<!-- END  GENERATED CONTENT -->
