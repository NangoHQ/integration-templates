<!-- BEGIN GENERATED CONTENT -->
# List Stages

## General Information

- **Description:** List all the stages that exist in the system. Use this action to find
the correct stage to be able to create an opportunity.
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_unanet_liststages`
- **Input Model:** `ActionInput_unanet_liststages`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/list-stages.ts)


## Endpoint Reference

### Request Endpoint

`GET /stages`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "stages": [
    {
      "id": "<number>",
      "name": "<string>",
      "status": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/list-stages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/list-stages.md)

<!-- END  GENERATED CONTENT -->

