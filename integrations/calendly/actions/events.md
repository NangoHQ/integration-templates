# Events

## General Information
- **Description:** Retrieve all events per a user
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/calendly/syncs/events.ts)

### Request Endpoint

- **Path:** `/events`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "uri": "<string>",
  "name": "<string | null>",
  "meeting_notes_plain": "<string | null>",
  "meeting_notes_html": "<string | null>",
  "status": "<active | canceled>",
  "start_time": "<string>",
  "end_time": "<string>",
  "event_type": "<string>",
  "location": {
    "type": "<string>",
    "location?": "<string>",
    "join_url?": "<string>",
    "status": "<string | null>",
    "additional_info": "<string>"
  },
  "invitees_counter": {
    "total": "<number>",
    "active": "<number>",
    "limit": "<number>"
  },
  "created_at": "<string>",
  "updated_at": "<string>",
  "event_memberships": [
    {
      "user": "<string>",
      "user_email": "<string | null>",
      "user_name": "<string>"
    }
  ],
  "event_guests": [
    {
      "email": "<string>",
      "created_at": "<string>",
      "updated_at": "<string>"
    }
  ],
  "calendar_event": "<CalendarEvent | null>",
  "cancellation?": {
    "canceled_by": "<string>",
    "reason": "<string | null>",
    "canceler_type": "<string>",
    "created_at": "<string>"
  }
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/events.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/events.md)

<!-- END  GENERATED CONTENT -->

undefined