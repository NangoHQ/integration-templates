<!-- BEGIN GENERATED CONTENT -->
# Messages

## General Information

- **Description:** This sync captures all LinkedIn messages for a Linkedin member for archiving purposes

- **Version:** 0.0.1
- **Group:** messages
- **Scopes:** `r_dma_portability_3rd_party`
- **Endpoint Type:** Sync
- **Model:** `LinkedInMessage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/linkedin/syncs/messages.ts)


## Endpoint Reference

### Request Endpoint

`GET /messages`

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
  "id": "<number>",
  "resourceId": "<string>",
  "method": "<string>",
  "owner": "<string>",
  "actor": "<string>",
  "activityId": "<string>",
  "processedAt": "<number>",
  "capturedAt": "<number>",
  "activityStatus": "<string>",
  "thread": "<string | null>",
  "author": "<string | null>",
  "createdAt": "<number | null>",
  "isDeleted": "<boolean>",
  "configVersion": "<number | null>",
  "methodName?": "<string>",
  "processedActivity?": "<any>",
  "deletedAt?": "<number>",
  "activityData?": {
    "actor": "<string>",
    "createdAt": "<number>",
    "attachments": [
      "<string>"
    ],
    "author": "<string>",
    "messageContexts": [
      "<any>"
    ],
    "thread": "<string>",
    "message?": "<string>",
    "version?": "<number>",
    "contentCertificationToken?": "<string>",
    "extensionContent?": "<any>"
  },
  "content?": "<LinkedInMessageContent | null>",
  "deliveredAt?": "<number>",
  "mailbox?": "<string>",
  "contentClassification?": "<ContentClassification | null>",
  "attachments?": [
    "<string>"
  ],
  "contentUrns?": [
    "<string>"
  ],
  "extensionContent?": "<any>",
  "messageContexts?": [
    "<string>"
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linkedin/syncs/messages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linkedin/syncs/messages.md)

<!-- END  GENERATED CONTENT -->

