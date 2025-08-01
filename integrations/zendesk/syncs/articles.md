<!-- BEGIN GENERATED CONTENT -->
# Articles

## General Information

- **Description:** Fetches a list of articles in Help center from Zendesk

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:** `hc:read`
- **Endpoint Type:** Sync
- **Model:** `Article`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/syncs/articles.ts)


## Endpoint Reference

### Request Endpoint

`GET /articles`

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
  "title": "<string>",
  "id": "<number>",
  "url": "<string>",
  "locale": "<string>",
  "user_segment_id": "<number | null>",
  "permission_group_id": "<number>",
  "author_id": "<number>",
  "body": "<string>",
  "comments_disabled": "<boolean>",
  "content_tag_ids": [
    "<number>"
  ],
  "created_at": "<string>",
  "draft": "<boolean>",
  "edited_at": "<string>",
  "html_url": "<string>",
  "label_names": [
    "<string>"
  ],
  "outdated": "<boolean>",
  "outdated_locales": [
    "<string>"
  ],
  "position": "<number>",
  "promoted": "<boolean>",
  "section_id": "<number>",
  "source_locale": "<string>",
  "updated_at": "<string>",
  "vote_count": "<number>",
  "vote_sum": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/articles.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/articles.md)

<!-- END  GENERATED CONTENT -->

