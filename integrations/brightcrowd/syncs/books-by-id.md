<!-- BEGIN GENERATED CONTENT -->
# Books By Id

## General Information

- **Description:** Fetches a list of specified books from Brightcrowd.

- **Version:** 1.0.0
- **Group:** Books
- **Scopes:** `bcb.partner/book.read`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/brightcrowd/syncs/books-by-id.ts)


## Endpoint Reference

### Request Endpoint

`GET /books-by-Id`

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
  "pictureId": "<string | null>",
  "config": "<string | null>",
  "coverPictureId": "<string | null>",
  "bannerPictureId": "<string | null>",
  "affiliation": "<Affiliation | null>",
  "questions": [
    {
      "id": "<string>",
      "type": "<string | null>",
      "name": "<string | null>",
      "description?": "<string | null>",
      "warning?": "<string | null>",
      "route": "<string | null>",
      "questionHeader": "<string | null>",
      "questionSubheader?": "<string | null>",
      "headline?": "<string | null>",
      "active": "<boolean>",
      "required": "<boolean>",
      "adminOnly": "<boolean>",
      "fields": [
        {
          "id": "<string>",
          "label": "<string>",
          "type": "<string>",
          "headline?": "<string | null>",
          "placeholder?": "<string | null>",
          "active": "<boolean>",
          "required": "<boolean>",
          "maxcount?": "<number | null>",
          "maxlength?": "<number | null>",
          "allowMentions": "<boolean>",
          "customizable": "<boolean>"
        }
      ]
    }
  ],
  "flags": [
    "<string>"
  ],
  "publishedAt?": "<string | null>",
  "closedAt?": "<string | null>",
  "lockedAt?": "<string | null>",
  "created": "<string>",
  "modified": "<string>",
  "frontMatter": "<FrontMatter | null>",
  "preface?": "<Preface | null>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/brightcrowd/syncs/books-by-id.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/brightcrowd/syncs/books-by-id.md)

<!-- END  GENERATED CONTENT -->

