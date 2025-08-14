<!-- BEGIN GENERATED CONTENT -->
# Create Note

## General Information

- **Description:** Action to create a note on a candidate.
- **Version:** 1.0.0
- **Group:** Notes
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_ashby_createnote`
- **Input Model:** `ActionInput_ashby_createnote`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/create-note.ts)


## Endpoint Reference

### Request Endpoint

`POST /notes`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "candidateId": "<string>",
  "note": "<<string> | {\"value\":\"<string>\",\"type\":\"<string>\"}>",
  "sendNotifications": "<boolean>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "createdAt": "<Date>",
  "content": "<string>",
  "author": {
    "id": "<string>",
    "firstName": "<string>",
    "lastName": "<string>",
    "email": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/create-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/create-note.md)

<!-- END  GENERATED CONTENT -->

