# Create Category

## General Information

- **Description:** Create a category in discourse
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/discourse/actions/create-category.ts)


## Endpoint Reference

### Request Endpoint

`POST /categories`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "color?": "<string>",
  "text_color?": "<string>",
  "parent_category_id?": "<string>",
  "slug?": "<string>",
  "search_priority?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "color": "<string>",
  "description": "<string | null>",
  "slug": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/discourse/actions/create-category.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/discourse/actions/create-category.md)

<!-- END  GENERATED CONTENT -->

