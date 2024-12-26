<!-- BEGIN GENERATED CONTENT -->
# Update Item

## General Information

- **Description:** Updates one or more items in Xero.

- **Version:** 1.0.2
- **Group:** Items
- **Scopes:** `accounting.settings`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/update-item.ts)


## Endpoint Reference

### Request Endpoint

`PUT /items`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-item.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-item.md)

<!-- END  GENERATED CONTENT -->

