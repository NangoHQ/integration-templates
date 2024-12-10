# Apply Posting

## General Information

- **Description:** Submit an application on behalf of a candidate. This endpoint can only be used to submit applications to published or unlisted postings.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/actions/apply-posting.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/posts/apply`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "postId": "<string>",
  "send_confirmation_email?": "<boolean>",
  "personalInformation": [
    {
      "name": "<string>",
      "value": "<string>"
    }
  ],
  "eeoResponses": "<object>",
  "urls?": [
    {
      "name": "<string>",
      "value": "<string>"
    }
  ],
  "CustomQuestions?": [
    {
      "id": "<string>",
      "fields": [
        {
          "value": "<string>"
        }
      ]
    }
  ],
  "ipAddress?": "<string>",
  "source?": "<string>",
  "consent?": {
    "marketing": {
      "provided": "<boolean>",
      "compliancePolicyId": "<string>"
    },
    "store": {
      "provided": "<boolean>",
      "compliancePolicyId": "<string>"
    }
  },
  "diversitySurvey?": {
    "surveyId": "<string>",
    "candidateSelectedLocation": "<string>",
    "responses": [
      {
        "questionId": "<string>",
        "questionText": "<string>",
        "questionType": "<string>",
        "answer": "<string>"
      }
    ]
  },
  "origin?": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "opportunityId?": "<string>",
  "response?": {
    "id": "<string>",
    "name": "<string>",
    "headline": "<string>",
    "contact": "<string>",
    "emails": [
      "<string>"
    ],
    "phones": [
      "<string>"
    ],
    "confidentiality": "<string>",
    "location": "<string>",
    "links": [
      "<string>"
    ],
    "archived": {
      "reason": "<string>",
      "archivedAt": "<number>"
    },
    "createdAt": "<number>",
    "updatedAt": "<number>",
    "lastInteractionAt": "<number>",
    "lastAdvancedAt": "<number>",
    "snoozedUntil": "<number>",
    "archivedAt": "<number>",
    "archiveReason": "<string>",
    "stage": "<string>",
    "stageChanges": [
      "<string>"
    ],
    "owner": "<string>",
    "tags": [
      "<string>"
    ],
    "sources": [
      "<string>"
    ],
    "origin": "<string>",
    "sourcedBy": "<string>",
    "applications": [
      "<string>"
    ],
    "resume": "<string>",
    "followers": [
      "<string>"
    ],
    "urls": {
      "list": "<string>",
      "show": "<string>"
    },
    "dataProtection": "<object>",
    "isAnonymized": "<boolean>",
    "opportunityLocation": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/apply-posting.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/actions/apply-posting.md)
