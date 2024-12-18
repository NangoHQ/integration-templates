<!-- BEGIN GENERATED CONTENT -->
# Application Update History

## General Information

- **Description:** Action to update history an application stage.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `candidatesWrite`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/application-update-history.ts)


## Endpoint Reference

### Request Endpoint

`POST /applications/history`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "applicationId": "<string>",
  "applicationHistory": [
    {
      "stageId": "<string>",
      "stageNumber": "<number>",
      "enteredStageAt": "<date>",
      "applicationHistoryId?": "<string>",
      "archiveReasonId?": "<string>"
    }
  ]
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "errors?": [
    "<string>"
  ],
  "results?": "<AshByApplicationSuccessObject | AshbyCreateCandidateResponse | InterviewStageListResponse>",
  "moreDataAvailable?": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-update-history.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-update-history.md)

<!-- END  GENERATED CONTENT -->

