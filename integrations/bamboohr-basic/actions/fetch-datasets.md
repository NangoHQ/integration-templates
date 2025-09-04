<!-- BEGIN GENERATED CONTENT -->
# Fetch Datasets

## General Information

- **Description:** Fetch available datasets from BambooHR
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_bamboohr_basic_fetchdatasets`
- **Input Model:** `ActionInput_bamboohr_basic_fetchdatasets`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bamboohr-basic/actions/fetch-datasets.ts)


## Endpoint Reference

### Request Endpoint

`GET /datasets`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "datasets": [
    {
      "name": "<string>",
      "displayName": "<string>",
      "description?": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/fetch-datasets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/fetch-datasets.md)

<!-- END  GENERATED CONTENT -->

