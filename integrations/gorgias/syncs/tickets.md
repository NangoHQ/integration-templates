<!-- BEGIN GENERATED CONTENT -->
# Tickets

## General Information

- **Description:** Fetches a list of tickets with their associated messages

- **Version:** 1.0.2
- **Group:** Tickets
- **Scopes:** `tickets:read`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gorgias/syncs/tickets.ts)


## Endpoint Reference

### Request Endpoint

`GET /tickets`

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
  "assignee_user": "<AssigneeUser | null>",
  "channel": "<aircall | api | chat | contact_form | email | facebook | facebook-mention | facebook-messenger | facebook-recommendations | help-center | instagram-ad-comment | instagram-comment | instagram-direct-message | instagram-mention | internal-note | phone | sms | twitter | twitter-direct-message | whatsapp | yotpo-review | string>",
  "closed_datetime": "<string | null>",
  "created_datetime": "<string | null>",
  "excerpt?": "<string | undefined>",
  "external_id": "<string | null>",
  "from_agent": "<boolean>",
  "integrations?": "<array | null | undefined>",
  "is_unread": "<boolean>",
  "language": "<string | null>",
  "last_message_datetime": "<string | null>",
  "last_received_message_datetime": "<string | null>",
  "messages_count?": "<number | undefined>",
  "messages": [
    {
      "id": "<number>",
      "uri": "<string>",
      "message_id": "<string | null>",
      "integration_id": "<number | null>",
      "rule_id": "<number | null>",
      "external_id": "<string | null>",
      "ticket_id": "<number>",
      "channel": "<aircall | api | chat | contact_form | email | facebook | facebook-mention | facebook-messenger | facebook-recommendations | help-center | instagram-ad-comment | instagram-comment | instagram-direct-message | instagram-mention | internal-note | phone | sms | twitter | twitter-direct-message | whatsapp | yotpo-review | string>",
      "via": "<aircall | api | chat | contact_form | email | facebook | facebook-mention | facebook-messenger | facebook-recommendations | form | gorgias_chat | help-center | helpdesk | instagram | instagram-ad-comment | instagram-comment | instagram-direct-message | instagram-mention | internal-note | offline_capture | phone | rule | self_service | shopify | sms | twilio | twitter | twitter-direct-message | whatsapp | yotpo | yotpo-review | zendesk>",
      "subject": "<string | null>",
      "body_text": "<string | null>",
      "body_html": "<string | null>",
      "stripped_text": "<string | null>",
      "stripped_html": "<string | null>",
      "stripped_signature": "<string | null>",
      "public": "<boolean>",
      "from_agent": "<boolean>",
      "sender": {
        "id": "<number>",
        "firstname": "<string>",
        "lastname": "<string>",
        "meta": "<object | null>",
        "email": "<string | null>",
        "name": "<string | null>"
      },
      "receiver": "<RecieverSender | null>",
      "attachments": "<Attachment[] | null>",
      "meta": "<object | null>",
      "headers": "<object | null>",
      "actions": "<array | null>",
      "macros": "<array | null>",
      "created_datetime": "<string | null>",
      "opened_datetime": "<string | null>",
      "failed_datetime": "<string | null>",
      "last_sending_error": "<object | null>",
      "deleted_datetime": "<string | null>",
      "replied_by?": "<string | null | undefined>",
      "replied_to?": "<string | null | undefined>"
    }
  ],
  "meta": "<object | null>",
  "opened_datetime": "<string | null>",
  "snooze_datetime": "<string | null>",
  "status": "<open | closed>",
  "subject": "<string | null>",
  "tags": {
    "0": {
      "id": "<number>",
      "name": "<string>",
      "uri": "<string | null>",
      "decoration": "<object | null>",
      "created_datetime": "<string | null>",
      "deleted_datetime?": "<string | null | undefined>"
    }
  },
  "spam": "<boolean | null>",
  "trashed_datetime": "<string | null>",
  "updated_datetime": "<string | null>",
  "via": "<aircall | api | chat | contact_form | email | facebook | facebook-mention | facebook-messenger | facebook-recommendations | form | gorgias_chat | help-center | helpdesk | instagram | instagram-ad-comment | instagram-comment | instagram-direct-message | instagram-mention | internal-note | offline_capture | phone | rule | self_service | shopify | sms | twilio | twitter | twitter-direct-message | whatsapp | yotpo | yotpo-review | zendesk>",
  "uri": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gorgias/syncs/tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gorgias/syncs/tickets.md)

<!-- END  GENERATED CONTENT -->

