# Create Category

## General Information

- **Description:** Create a category within the help center
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: hc:write
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/create-category.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/categories`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "category": {
    "name": "<string>",
    "description?": "<string>"
  }
}
```

### Request Response

```json
{
  "id": "<string>",
  "url": "<string>",
  "name": "<string>",
  "description": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-category.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-category.md)
