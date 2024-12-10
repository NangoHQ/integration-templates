# Postings

## General Information

- **Description:** Fetches a list of all postings in Lever

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: postings:read:admin
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/postings.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/postings`
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
