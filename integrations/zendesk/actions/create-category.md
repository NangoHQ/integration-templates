<!-- BEGIN GENERATED CONTENT -->
# Create Category

## General Information

- **Description:** Create a category within the help center
- **Version:** 0.0.1
- **Group:** Categories
- **Scopes:** `hc:write`
- **Endpoint Type:** Action
- **Model:** `Category`
- **Input Model:** `CategoryCreate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/create-category.ts)


## Endpoint Reference

### Request Endpoint

`POST /categories`

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
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-category.md)

<!-- END  GENERATED CONTENT -->

