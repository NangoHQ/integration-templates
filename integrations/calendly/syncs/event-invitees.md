<!-- BEGIN GENERATED CONTENT -->
# Event Invitees

## General Information

- **Description:** For all events (active and canceled) retrieve the event invitees
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `EventInvitee`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/calendly/syncs/event-invitees.ts)


## Endpoint Reference

### Request Endpoint

`GET /event/invitees`

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
  "cancel_url": "<string>",
  "created_at": "<string>",
  "email": "<string>",
  "event": "<string>",
  "name": "<string>",
  "first_name": "<string | null>",
  "last_name": "<string | null>",
  "new_invitee": "<string | null>",
  "old_invitee": "<string | null>",
  "questions_and_answers": [
    {
      "answer": "<string>",
      "position": "<number>",
      "question": "<string>"
    }
  ],
  "reschedule_url": "<string>",
  "rescheduled": "<boolean>",
  "status": "<string>",
  "text_reminder_number": "<string | null>",
  "timezone": "<string>",
  "tracking": {
    "utm_campaign": "<string | null>",
    "utm_source": "<string | null>",
    "utm_medium": "<string | null>",
    "utm_content": "<string | null>",
    "utm_term": "<string | null>",
    "salesforce_uuid": "<string | null>"
  },
  "updated_at": "<string>",
  "uri": "<string>",
  "cancellation?": {
    "canceled_by": "<string>",
    "reason": "<string | null>",
    "canceler_type": "<string>",
    "created_at": "<string>"
  },
  "routing_form_submission": "<string | null>",
  "payment": "<Payment | null>",
  "no_show": "<string | null>",
  "reconfirmation": "<Reconfirmation | null>",
  "scheduling_method": "<string | null>",
  "invitee_scheduled_by": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/event-invitees.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/event-invitees.md)

<!-- END  GENERATED CONTENT -->

