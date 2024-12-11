# Fetch Rich Page

## General Information

- **Description:** Fetch a specific page in Notion by passing a pageId. This action fetches a page,
and its content and converts it into a full markdown. It transforms images,
tables, uploaded files, etc., into their markdown counterparts, providing a complete markdown.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/actions/fetch-rich-page.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/fetch-rich-page`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "pageId": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "path": "<string>",
  "title": "<string>",
  "content": "<string>",
  "contentType": "<string>",
  "meta": "<object>",
  "last_modified": "<string>",
  "parent_id?": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/fetch-rich-page.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/fetch-rich-page.md)

<!-- END  GENERATED CONTENT -->

