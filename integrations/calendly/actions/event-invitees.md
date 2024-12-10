# Event Invitees

## General Information
- **Description:** For all events (active and canceled) retrieve the event invitees
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/calendly/syncs/event-invitees.ts)

### Request Endpoint

- **Path:** `/event/invitees`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

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

undefined