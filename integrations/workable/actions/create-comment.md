<!-- BEGIN GENERATED CONTENT -->
# Create Comment

## General Information

- **Description:** Action to create a comment on the applicant's timeline
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `w_candidates or w_comments`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_workable_createcomment`
- **Input Model:** `ActionInput_workable_createcomment`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/actions/create-comment.ts)


## Endpoint Reference

### Request Endpoint

`POST /workable/create-comment`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "member_id": "<string>",
  "comment": {
    "body": "<string>",
    "policy": "<string[]>",
    "attachment": {
      "name": "<string>",
      "data": "<string>"
    }
  }
}
```

### Request Response

```json
{
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/actions/create-comment.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/actions/create-comment.md)

<!-- END  GENERATED CONTENT -->

