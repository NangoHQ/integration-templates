<!-- BEGIN GENERATED CONTENT -->
# Pages

## General Information

- **Description:** Fetches a list of all pages in a book from Brightcrowd.

- **Version:** 1.0.0
- **Group:** Books
- **Scopes:** `bcb.partner/page.read`
- **Endpoint Type:** Sync
- **Model:** `Page`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/brightcrowd/syncs/pages.ts)


## Endpoint Reference

### Request Endpoint

`GET /pages`

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
  "alias": "<string>",
  "name": "<string>",
  "status": "<draft | published | hidden>",
  "content": {
    "firstName": "<string>",
    "lastName": "<string>",
    "previousName?": "<string | null>",
    "suffix?": "<string>",
    "partnerFirstName?": "<string | null>",
    "partnerLastName?": "<string | null>",
    "pronouns?": "<string>",
    "pictureId?": "<string | null>",
    "audioId?": "<string | null>"
  },
  "pictures?": "<Picture[] | null>",
  "videos?": "<Video[] | null>",
  "tagUsers?": "<string[] | null>",
  "homeTown?": "<string | null>",
  "currentCity?": "<string | null>",
  "campusResidence?": "<string | null>",
  "affiliations?": "<Affiliation[] | null>",
  "plan?": "<school | work | other>",
  "created": "<string>",
  "modifiedByUserAt?": "<string | null>",
  "completedByUserAt?": "<string | null>",
  "externalId?": "<string>"
}
```

### Expected Metadata

```json
{
  "bookIds": [
    "<string>"
  ],
  "timeframe?": "<7days | 30days | 90days | all>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/brightcrowd/syncs/pages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/brightcrowd/syncs/pages.md)

<!-- END  GENERATED CONTENT -->

