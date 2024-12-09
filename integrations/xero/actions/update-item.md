# Update Item

## General Information

- **Description:** Updates one or more items in Xero.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: accounting.settings
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/update-item.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /items
- **Method:** PUT

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "id": "<string>",
      "item_code": "<string | null>",
      "name": "<string>",
      "description": "<string | null>",
      "account_code": "<string | null>"
    }
  ]
}
```

### Request Response

```json
{
  "succeededItems": [
    {
      "id": "<string>",
      "item_code": "<string | null>",
      "name": "<string>",
      "description": "<string | null>",
      "account_code": "<string | null>"
    }
  ],
  "failedItems": [
    {
      "__extends": {
        "id": "<string>",
        "item_code": "<string | null>",
        "name": "<string>",
        "description": "<string | null>",
        "account_code": "<string | null>"
      },
      "validation_errors": [
        "<any>"
      ]
    }
  ]
}
```
