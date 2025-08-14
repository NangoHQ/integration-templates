<!-- BEGIN GENERATED CONTENT -->
# Create Ticket

## General Information

- **Description:** Creates a new ticket
- **Version:** 1.0.0
- **Group:** Tickets
- **Scopes:** `tickets:write, account:read, customers:write, customers:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_gorgias_createticket`
- **Input Model:** `ActionInput_gorgias_createticket`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gorgias/actions/create-ticket.ts)


## Endpoint Reference

### Request Endpoint

`POST /ticket`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "customer": {
    "phone_number": "<string>",
    "email?": "<string>"
  },
  "ticket": {
    "messages": [
      {
        "attachments": [
          {
            "url": "<string>",
            "name": "<string>",
            "size": "<number>",
            "content_type": "<string>"
          }
        ],
        "body_html": "<string>",
        "body_text": "<string>",
        "id": "<string>"
      }
    ]
  }
}
```

### Request Response

```json
{
  "id": "<string>",
  "assignee_user": "<{\"id\":\"<number>\",\"firstname\":\"<string>\",\"lastname\":\"<string>\",\"meta\":\"<{} | <null>>\",\"email\":\"<string>\",\"name\":\"<string>\",\"bio\":\"<string | null>\"} | <null>>",
  "channel": "<string>",
  "closed_datetime": "<string | null>",
  "created_datetime": "<string | null>",
  "excerpt?": "<string>",
  "external_id": "<string | null>",
  "from_agent": "<boolean>",
  "integrations?": "<<unknown[]> | <null>>",
  "is_unread": "<boolean>",
  "language": "<string | null>",
  "last_message_datetime": "<string | null>",
  "last_received_message_datetime": "<string | null>",
  "messages_count?": "<number>",
  "messages": [
    {
      "id": "<number>",
      "uri": "<string>",
      "message_id": "<string | null>",
      "integration_id": "<number | null>",
      "rule_id": "<number | null>",
      "external_id": "<string | null>",
      "ticket_id": "<number>",
      "channel": "<string>",
      "via": "<enum: 'aircall' | 'api' | 'chat' | 'contact_form' | 'email' | 'facebook' | 'facebook-mention' | 'facebook-messenger' | 'facebook-recommendations' | 'form' | 'gorgias_chat' | 'help-center' | 'helpdesk' | 'instagram' | 'instagram-ad-comment' | 'instagram-comment' | 'instagram-direct-message' | 'instagram-mention' | 'internal-note' | 'offline_capture' | 'phone' | 'rule' | 'self_service' | 'shopify' | 'sms' | 'twilio' | 'twitter' | 'twitter-direct-message' | 'whatsapp' | 'yotpo' | 'yotpo-review' | 'zendesk'>",
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
        "meta": "<{} | <null>>",
        "email": "<string | null>",
        "name": "<string | null>"
      },
      "receiver": "<{\"id\":\"<number>\",\"firstname\":\"<string>\",\"lastname\":\"<string>\",\"meta\":\"<{} | <null>>\",\"email\":\"<string | null>\",\"name\":\"<string | null>\"} | <null>>",
      "attachments": "<[{\"url\":\"<string>\",\"name\":\"<string>\",\"size\":\"<number | null>\",\"content_type\":\"<string>\",\"public\":\"<boolean>\",\"extra\":\"<string | null>\"}] | <null>>",
      "meta": "<{} | <null>>",
      "headers": "<{} | <null>>",
      "actions": "<<unknown[]> | <null>>",
      "macros": "<<unknown[]> | <null>>",
      "created_datetime": "<string | null>",
      "opened_datetime": "<string | null>",
      "failed_datetime": "<string | null>",
      "last_sending_error": "<{} | <null>>",
      "deleted_datetime": "<string | null>",
      "replied_by?": "<string | null>",
      "replied_to?": "<string | null>"
    }
  ],
  "meta": "<{} | <null>>",
  "opened_datetime": "<string | null>",
  "snooze_datetime": "<string | null>",
  "status": "<enum: 'open' | 'closed'>",
  "subject": "<string | null>",
  "tags": [
    {
      "id": "<number>",
      "name": "<string>",
      "uri": "<string | null>",
      "decoration": "<{} | <null>>",
      "created_datetime": "<string | null>",
      "deleted_datetime?": "<string | null>"
    }
  ],
  "spam": "<boolean | null>",
  "trashed_datetime": "<string | null>",
  "updated_datetime": "<string | null>",
  "via": "<enum: 'aircall' | 'api' | 'chat' | 'contact_form' | 'email' | 'facebook' | 'facebook-mention' | 'facebook-messenger' | 'facebook-recommendations' | 'form' | 'gorgias_chat' | 'help-center' | 'helpdesk' | 'instagram' | 'instagram-ad-comment' | 'instagram-comment' | 'instagram-direct-message' | 'instagram-mention' | 'internal-note' | 'offline_capture' | 'phone' | 'rule' | 'self_service' | 'shopify' | 'sms' | 'twilio' | 'twitter' | 'twitter-direct-message' | 'whatsapp' | 'yotpo' | 'yotpo-review' | 'zendesk'>",
  "uri": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gorgias/actions/create-ticket.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gorgias/actions/create-ticket.md)

<!-- END  GENERATED CONTENT -->

