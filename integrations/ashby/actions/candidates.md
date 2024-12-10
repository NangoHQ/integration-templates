# Candidates

## General Information
- **Description:** Fetches a list of all candidates from your ashby account

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: candidatelastsyncToken
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/syncs/candidates.ts)

### Request Endpoint

- **Path:** `/candidates`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "createdAt": "<date>",
  "name": "<string>",
  "primaryEmailAddress": {
    "value": "<string>",
    "type": "<string>",
    "isPrimary": "<boolean>"
  },
  "emailAddresses": [
    "<string>"
  ],
  "primaryPhoneNumber": {
    "value": "<string>",
    "type": "<string>",
    "isPrimary": "<boolean>"
  },
  "phoneNumbers": [
    "<string>"
  ],
  "socialLinks": [
    "<string>"
  ],
  "tags": [
    "<string>"
  ],
  "position": "<string>",
  "company": "<string>",
  "school": "<string>",
  "applicationIds": [
    "<string>"
  ],
  "resumeFileHandle": {
    "id": "<string>",
    "name": "<string>",
    "handle": "<string>"
  },
  "fileHandles": [
    "<string>"
  ],
  "customFields": [
    "<string>"
  ],
  "profileUrl": "<string>",
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
  "creditedToUser": {
    "id": "<string>",
    "firstName": "<string>",
    "lastName": "<string>",
    "email": "<string>",
    "globalRole": "<string>",
    "isEnabled": "<boolean>",
    "updatedAt": "<date>"
  }
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/syncs/candidates.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/syncs/candidates.md)

<!-- END  GENERATED CONTENT -->

undefined