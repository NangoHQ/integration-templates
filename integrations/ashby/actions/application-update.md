<!-- BEGIN GENERATED CONTENT -->
# Application Update

## General Information

- **Description:** Action to update an application.

- **Version:** 1.0.1
- **Group:** Applications
- **Scopes:** `candidatesWrite`
- **Endpoint Type:** Action
- **Model:** `AshbyResponse`
- **Input Model:** `ChangeSource | ChangeStage | UpdateHistory`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/application-update.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /applications`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<ChangeSource | ChangeStage | UpdateHistory>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-update.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-update.md)

<!-- END  GENERATED CONTENT -->

