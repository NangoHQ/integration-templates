<!-- BEGIN GENERATED CONTENT -->
# Create Topic

## General Information

- **Description:** Create a new topic in discourse
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_discourse_createtopic`
- **Input Model:** `ActionInput_discourse_createtopic`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/discourse/actions/create-topic.ts)


## Endpoint Reference

### Request Endpoint

`POST /topics`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "title": "<string>",
  "category": "<number>",
  "raw": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "content": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/discourse/actions/create-topic.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/discourse/actions/create-topic.md)

<!-- END  GENERATED CONTENT -->

