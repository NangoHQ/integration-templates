<!-- BEGIN GENERATED CONTENT -->
# Update Topic Status

## General Information

- **Description:** Update the status of a topic
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/discourse/actions/update-topic-status.ts)


## Endpoint Reference

### Request Endpoint

`PUT /topics/status`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "status": "<closed | pinned | pinned_globally | archived | visible>",
  "enabled": "<true | false>",
  "until": "<string>"
}
```

### Request Response

```json
{
  "success": "<string>",
  "result": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/discourse/actions/update-topic-status.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/discourse/actions/update-topic-status.md)

<!-- END  GENERATED CONTENT -->

