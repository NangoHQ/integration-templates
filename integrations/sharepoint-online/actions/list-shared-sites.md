<!-- BEGIN GENERATED CONTENT -->
# List Shared Sites

## General Information

- **Description:** This action will be used to display a list of sites to the end-user, who will pick the ones he wants to sync.
The connection metadata should be set based on the file selection.
- **Version:** 3.0.0
- **Group:** Others
- **Scopes:** `Sites.Read.All, Sites.Selected, offline_access`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_sharepoint_online_listsharedsites`
- **Input Model:** `ActionInput_sharepoint_online_listsharedsites`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/sharepoint-online/actions/list-shared-sites.ts)


## Endpoint Reference

### Request Endpoint

`GET /list-sites`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "sitesToSync": [
    {
      "id": "<string>",
      "name": "<string>",
      "createdDateTime": "<string>",
      "webUrl": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/actions/list-shared-sites.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/actions/list-shared-sites.md)

<!-- END  GENERATED CONTENT -->

