<!-- BEGIN GENERATED CONTENT -->
# Fetch Pipelines

## General Information

- **Description:** Fetch all pipelines for an object type. Defaults to deals
- **Version:** 0.0.1
- **Group:** Pipelines
- **Scopes:** `oauth, crm.objects.deals.read`
- **Endpoint Type:** Action
- **Model:** `PipelineOutput`
- **Input Model:** `OptionalObjectType`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-pipelines.ts)


## Endpoint Reference

### Request Endpoint

`GET /pipelines`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "objectType?": "<string>"
}
```

### Request Response

```json
{
  "pipelines": [
    {
      "updatedAt": "<string>",
      "createdAt": "<string>",
      "label": "<string>",
      "displayOrder": "<number>",
      "id": "<string>",
      "archived": "<boolean>",
      "stages": [
        {
          "updatedAt": "<string>",
          "createdAt": "<string>",
          "label": "<string>",
          "displayOrder": "<number>",
          "metadata": {
            "isClosed": "<boolean>",
            "probability": "<string>"
          },
          "id": "<string>",
          "archived": "<boolean>",
          "writePermissions": "<string>"
        }
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-pipelines.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-pipelines.md)

<!-- END  GENERATED CONTENT -->

