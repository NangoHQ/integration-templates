# Opportunities Applications

## General Information

- **Description:** Fetches a list of all applications for a candidate in Lever

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: applications:read:admin
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/opportunities-applications.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/applications`
- **Method:** `GET`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "opportunityId": "<string>",
  "candidateId": "<string>",
  "createdAt": "<number>",
  "type": "<string>",
  "posting": "<string>",
  "postingHiringManager": "<string>",
  "postingOwner": "<string>",
  "user": "<string>",
  "name": "<string>",
  "email": "<string>",
  "phone": {
    "type": "<string>",
    "value": "<string>"
  },
  "requisitionForHire": {
    "id": "<string>",
    "requisitionCode": "<string>",
    "hiringManagerOnHire": "<string>"
  },
  "ownerId": "<string>",
  "hiringManager": "<string>",
  "company": "<string>",
  "links": [
    "<string>"
  ],
  "comments": "<string>",
  "customQuestions": [
    "<string>"
  ],
  "archived": {
    "reason": "<string>",
    "archivedAt": "<number>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-applications.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-applications.md)
