# Postings

## General Information
- **Description:** Fetches a list of all postings in Lever

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: postings:read:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/postings.ts)

### Request Endpoint

- **Path:** `/postings`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "perform_as?": "<string>",
  "id": "<string>",
  "text": "<string>",
  "createdAt": "<number>",
  "updatedAt": "<number>",
  "user": "<string>",
  "owner": "<string>",
  "hiringManager": "<string>",
  "confidentiality": "<string>",
  "categories": {
    "team": "<string>",
    "department": "<string>",
    "location": "<string>",
    "allLocations": [
      "<string>"
    ],
    "commitment": "<string>",
    "level": "<string>"
  },
  "content": {
    "description": "<string>",
    "descriptionHtml": "<string>",
    "lists": [
      "<string>"
    ],
    "closing": "<string>",
    "closingHtml": "<string>"
  },
  "country": "<string>",
  "followers": [
    "<string>"
  ],
  "tags": [
    "<string>"
  ],
  "state": "<string>",
  "distributionChannels": [
    "<string>"
  ],
  "reqCode": "<string>",
  "requisitionCodes": [
    "<string>"
  ],
  "salaryDescription": "<string>",
  "salaryDescriptionHtml": "<string>",
  "salaryRange": {
    "max": "<number>",
    "min": "<number>",
    "currency": "<string>",
    "interval": "<string>"
  },
  "urls": {
    "list": "<string>",
    "show": "<string>",
    "apply": "<string>"
  },
  "workplaceType": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/postings.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/postings.md)

<!-- END  GENERATED CONTENT -->







undefined