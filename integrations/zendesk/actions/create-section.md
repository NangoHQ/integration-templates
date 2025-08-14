<!-- BEGIN GENERATED CONTENT -->
# Create Section

## General Information

- **Description:** Create a section within a category in the help center
- **Version:** 1.0.0
- **Group:** Sections
- **Scopes:** `hc:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_zendesk_createsection`
- **Input Model:** `ActionInput_zendesk_createsection`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/create-section.ts)


## Endpoint Reference

### Request Endpoint

`POST /sections`

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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-section.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/create-section.md)

<!-- END  GENERATED CONTENT -->

