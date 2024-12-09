# Create Section

## General Information

- **Description:** Create a section within a category in the help center
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: hc:write
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/create-section.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /sections
- **Method:** POST

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "category_id": "<number>",
  "section": {
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
  "category_id": "<number>",
  "name": "<string>",
  "description": "<string>"
}
```
