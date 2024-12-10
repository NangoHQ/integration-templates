# Tickets

## General Information

- **Description:** Fetches a list of tickets from Zendesk

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: tickets:read
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/syncs/tickets.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/tickets`
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
  "url": "<string | null>",
  "id": "<number>",
  "external_id": "<string | null>",
  "via": "<Via | null>",
  "created_at": "<string | null>",
  "updated_at": "<string | null>",
  "generated_timestamp": "<number | null>",
  "type": "<string | null>",
  "subject": "<string | null>",
  "raw_subject": "<string | null>",
  "description": "<string | null>",
  "priority": "<string | null>",
  "status": "<string | null>",
  "recipient": "<string | null>",
  "requester_id": "<number | null>",
  "submitter_id": "<number | null>",
  "assignee_id": "<number | null>",
  "organization_id": "<number | null>",
  "group_id": "<number | null>",
  "collaborator_ids": "<number[] | null>",
  "follower_ids": "<number[] | null>",
  "email_cc_ids": "<number[] | null>",
  "forum_topic_id": "<string | null>",
  "problem_id": "<string | null>",
  "has_incidents": "<boolean | null>",
  "is_public": "<boolean | null>",
  "due_at": "<string | null>",
  "tags": "<string[] | null>",
  "custom_fields": "<CustomFields[] | null>",
  "satisfaction_rating": "<object | null>",
  "sharing_agreement_ids": "<number[] | null>",
  "custom_status_id": "<number | null>",
  "fields": "<CustomFields[] | null>",
  "followup_ids": "<number[] | null>",
  "ticket_form_id": "<number | null>",
  "brand_id": "<number | null>",
  "allow_channelback": "<boolean | null>",
  "allow_attachments": "<boolean | null>",
  "from_messaging_channel": "<boolean | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/tickets.md)

<!-- END  GENERATED CONTENT -->

