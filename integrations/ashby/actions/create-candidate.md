# Create Candidate

## General Information

- **Description:** Action to create a candidate.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `candidatesWrite`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/create-candidate.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/candidates`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "email?": "<string>",
  "phoneNumber?": "<string>",
  "linkedInUrl?": "<string>",
  "githubUrl?": "<string>",
  "website?": "<string>",
  "alternateEmailAddresses?": [
    "<string>"
  ],
  "sourceId?": "<string>",
  "creditedToUserId?": "<string>",
  "location?": {
    "city?": "<string>",
    "region?": "<string>",
    "country?": "<string>"
  },
  "createdAt?": "<date>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/create-candidate.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/create-candidate.md)

<!-- END  GENERATED CONTENT -->

