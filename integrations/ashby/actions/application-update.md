<!-- BEGIN GENERATED CONTENT -->
# Application Update

## General Information

- **Description:** Action to update an application.
- **Version:** 2.0.0
- **Group:** Applications
- **Scopes:** `candidatesWrite`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_ashby_applicationupdate`
- **Input Model:** `ActionInput_ashby_applicationupdate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/actions/application-update.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /applications`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "0": {
    "applicationId": "<string>",
    "sourceId": "<string>"
  },
  "1": {
    "applicationId": "<string>",
    "interviewStageId": "<string>",
    "archiveReasonId?": "<string>"
  },
  "2": {
    "applicationId": "<string>",
    "applicationHistory": [
      {
        "stageId": "<string>",
        "stageNumber": "<number>",
        "enteredStageAt": "<Date>",
        "applicationHistoryId?": "<string>",
        "archiveReasonId?": "<string>"
      }
    ]
  }
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "errors": "<string[]>",
  "results?": "<{\"id\":\"<string>\",\"createdAt\":\"<Date>\",\"updatedAt\":\"<Date>\",\"status\":\"<string>\",\"customFields\":[{}],\"candidate\":{\"id\":\"<string>\",\"name\":\"<string>\",\"primaryEmailAddress?\":{\"value\":\"<string>\",\"type?\":\"<unknown>\",\"isPrimary\":\"<string>\"},\"primaryPhoneNumber?\":{}},\"currentInterviewStage\":{\"id\":\"<string>\",\"title\":\"<string>\",\"type\":\"<string>\",\"orderInInterviewPlan\":\"<number>\",\"interviewStageGroupId?\":\"<string>\",\"interviewPlanId\":\"<string>\"},\"source?\":{\"id\":\"<string>\",\"title\":\"<string>\",\"isArchived\":\"<boolean>\",\"sourceType\":{\"id\":\"<string>\",\"title\":\"<string>\",\"isArchived\":\"<boolean>\"}},\"archiveReason?\":{\"id\":\"<string>\",\"text\":\"<string>\",\"reasonType\":\"<string>\",\"isArchived\":\"<boolean>\"},\"archivedAt?\":\"<Date>\",\"job\":{\"id\":\"<string>\",\"title\":\"<string>\",\"locationId\":\"<string>\",\"departmentId\":\"<string>\"},\"creditedToUser?\":{\"id\":\"<string>\",\"firstName\":\"<string>\",\"lastName\":\"<string>\",\"email?\":\"<string>\",\"globalRole\":\"<string>\",\"isEnabled\":\"<boolean>\",\"updatedAt\":\"<Date>\"},\"hiringTeam\":[{\"email\":\"<string>\",\"firstName\":\"<string>\",\"lastName\":\"<string>\",\"role\":\"<string>\",\"userId\":\"<string>\"}],\"appliedViaJobPostingId?\":\"<string>\"} | {\"id\":\"<string>\",\"createdAt?\":\"<Date>\",\"updatedAt?\":\"<Date>\",\"name\":\"<string>\",\"primaryEmailAddress?\":{\"value\":\"<string>\",\"type\":\"<string>\",\"isPrimary\":\"<boolean>\"},\"emailAddresses\":[{\"value\":\"<string>\",\"type\":\"<string>\",\"isPrimary\":\"<boolean>\"}],\"primaryPhoneNumber\":[{\"value\":\"<string>\",\"type\":\"<string>\",\"isPrimary\":\"<boolean>\"}],\"phoneNumbers\":[{\"value\":\"<string>\",\"type\":\"<string>\",\"isPrimary\":\"<boolean>\"}],\"socialLinks\":[{\"type\":\"<string>\",\"url\":\"<string>\"}],\"tags\":[{\"id\":\"<string>\",\"title\":\"<string>\",\"isArchived\":\"<boolean>\"}],\"position?\":\"<string | null>\",\"company?\":\"<string | null>\",\"applicationIds\":\"<string[]>\",\"resumeFileHandle?\":{\"id\":\"<string>\",\"name\":\"<string>\",\"handle\":\"<string>\"},\"fileHandles\":[{\"id\":\"<string>\",\"name\":\"<string>\",\"handle\":\"<string>\"}],\"customFields\":[{}],\"profileUrl\":\"<string>\",\"source?\":{\"id\":\"<string>\",\"title\":\"<string>\",\"isArchived\":\"<boolean>\",\"sourceType?\":{\"id\":\"<string>\",\"title\":\"<string>\",\"isArchived\":\"<string>\"}},\"creditedToUser?\":{\"id\":\"<string>\",\"firstName\":\"<string>\",\"lastName\":\"<string>\",\"email\":\"<string>\",\"globalRole\":\"<string>\",\"isEnabled\":\"<boolean>\",\"updatedAt\":\"<Date>\"},\"timezone?\":\"<string>\",\"primaryLocation?\":{\"id\":\"<string>\",\"locationSummary\":\"<string>\",\"locationComponents\":[{\"type\":\"<string>\",\"name\":\"<string>\"}]}} | {\"id\":\"<string>\",\"title\":\"<string>\",\"type\":\"<string>\",\"orderInInterviewPlan\":\"<number>\",\"interviewStageGroupId?\":\"<string>\",\"interviewPlanId\":\"<string>\"}>",
  "moreDataAvailable?": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-update.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/actions/application-update.md)

<!-- END  GENERATED CONTENT -->

