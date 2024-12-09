# Credit Note Update

## General Information

- **Description:** Updates a credit note in Netsuite
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/credit-note-update.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/credit-notes`
- **Method:** `PUT`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "__extends": {
    "customerId": "<string>",
    "status": "<string>",
    "currency": "<string>",
    "description?": "<string>",
    "lines": [
      {
        "itemId": "<string>",
        "quantity": "<number>",
        "amount": "<number>",
        "vatCode?": "<string>",
        "description?": "<string>"
      }
    ]
  },
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```
