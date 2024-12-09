# Fetch Pipelines

## General Information

- **Description:** Fetch all pipelines for an object type. Defaults to deals
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: oauth,crm.objects.deals.read
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-pipelines.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/pipelines`
- **Method:** `GET`

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
      "__extends": {
        "updatedAt": "<string>",
        "createdAt": "<string>"
      },
      "label": "<string>",
      "displayOrder": "<number>",
      "id": "<string>",
      "archived": "<boolean>",
      "stages": [
        {
          "__extends": {
            "updatedAt": "<string>",
            "createdAt": "<string>"
          },
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
