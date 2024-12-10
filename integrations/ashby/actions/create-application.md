# Create Application

## General Information

- **Description:** Action to consider a candidate for a job

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/create-application.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/applications`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "candidateId": "<string>",
  "jobId": "<string>",
  "interviewPlanId": "<string | undefined>",
  "interviewStageId": "<string | undefined>",
  "sourceId": "<string | undefined>",
  "creditedToUserId": "<string | undefined>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "createdAt": "<date>",
  "updatedAt": "<date>",
  "status": "<string>",
  "customFields": [
    "<string>"
  ],
  "candidate": {
    "id": "<string>",
    "name": "<string>",
    "primaryEmailAddress": {
      "value": "<string>",
      "type": "<string>",
      "isPrimary": "<boolean>"
    },
    "primaryPhoneNumber": {
      "value": "<string>",
      "type": "<string>",
      "isPrimary": "<boolean>"
    }
  },
  "currentInterviewStage": {
    "id": "<string>",
    "title": "<string>",
    "type": "<string>",
    "orderInInterviewPlan": "<number>",
    "interviewPlanId": "<string>"
  },
  "source": {
    "id": "<string>",
    "title": "<string>",
    "isArchived": "<boolean>",
    "sourceType": {
      "id": "<string>",
      "title": "<string>",
      "isArchived": "<boolean>"
    }
  },
  "archiveReason": {
    "id": "<string>",
    "text": "<string>",
    "reasonType": "<string>",
    "isArchived": "<boolean>"
  },
  "job": {
    "id": "<string>",
    "title": "<string>",
    "locationId": "<string>",
    "departmentId": "<string>"
  },
  "creditedToUser": {
    "id": "<string>",
    "firstName": "<string>",
    "lastName": "<string>",
    "email": "<string>",
    "globalRole": "<string>",
    "isEnabled": "<boolean>",
    "updatedAt": "<date>"
  },
  "hiringTeam": [
    "<string>"
  ],
  "appliedViaJobPostingId": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/create-application.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/create-application.md)
