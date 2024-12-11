<!-- BEGIN GENERATED CONTENT -->
# Create Invoice

## General Information

- **Description:** Creates an invoice in ExactOnline

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/exact-online/actions/create-invoice.ts)


## Endpoint Reference

### Request Endpoint

`POST /invoices`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "customerId": "<string>",
  "journal?": "<number>",
  "currency?": "<EUR>",
  "description?": "<string>",
  "createdAt?": "<date>",
  "lines": [
    {
      "itemId": "<string>",
      "quantity": "<number>",
      "amountNet": "<number>",
      "vatCode?": "<string>",
      "description?": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/create-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/create-invoice.md)

<!-- END  GENERATED CONTENT -->

