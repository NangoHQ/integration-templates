<!-- BEGIN GENERATED CONTENT -->
# Create Item

## General Information

- **Description:** Creates one or more items in Xero.
Note: Does NOT check if the item already exists.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:** `accounting.settings`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-item.ts)


## Endpoint Reference

### Request Endpoint

`POST /items`

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
      "id": "<string>",
      "item_code": "<string | null>",
      "name": "<string>",
      "description": "<string | null>",
      "account_code": "<string | null>",
      "validation_errors": [
        "<any>"
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-item.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-item.md)

<!-- END  GENERATED CONTENT -->

