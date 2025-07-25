<!-- BEGIN GENERATED CONTENT -->
# Application Change Source

## General Information

- **Description:** Action to change source of application.

- **Version:** 0.0.1
- **Group:** Applications
- **Scopes:** `candidatesWrite`
- **Endpoint Type:** Action
- **Model:** `AshbyResponse`
- **Input Model:** `ChangeSource`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/application-change-source.ts)


## Endpoint Reference

### Request Endpoint

`POST /applications/source`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "applicationId": "<string>",
  "sourceId": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-change-source.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-change-source.md)

<!-- END  GENERATED CONTENT -->

