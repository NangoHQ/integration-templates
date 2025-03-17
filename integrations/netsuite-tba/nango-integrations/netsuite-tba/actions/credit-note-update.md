<!-- BEGIN GENERATED CONTENT -->
# Credit Note Update

## General Information

- **Description:** Updates a credit note in Netsuite
- **Version:** 1.0.0
- **Group:** Credit Notes
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/credit-note-update.ts)


## Endpoint Reference

### Request Endpoint

`PUT /credit-notes`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
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
  ],
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/credit-note-update.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/credit-note-update.md)

<!-- END  GENERATED CONTENT -->

