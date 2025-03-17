<!-- BEGIN GENERATED CONTENT -->
# Credit Note Create

## General Information

- **Description:** Creates a credit note in Netsuite

- **Version:** 1.0.0
- **Group:** Credit Notes
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/credit-note-create.ts)


## Endpoint Reference

### Request Endpoint

`POST /credit-notes`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/credit-note-create.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/credit-note-create.md)

<!-- END  GENERATED CONTENT -->

