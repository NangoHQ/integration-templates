<!-- BEGIN GENERATED CONTENT -->
# Candidates

## General Information

- **Description:** Fetches a list of all candidates from your ashby account

- **Version:** 0.0.1
- **Group:** Candidates
- **Scopes:** `candidatelastsyncToken`
- **Endpoint Type:** Sync
- **Model:** `AshbyCandidate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/syncs/candidates.ts)


## Endpoint Reference

### Request Endpoint

`GET /candidates`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

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

