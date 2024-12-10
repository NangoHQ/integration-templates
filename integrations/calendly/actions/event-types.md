# Event Types

## General Information
- **Description:** Retrieve all event types per a user
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/calendly/syncs/event-types.ts)

### Request Endpoint

- **Path:** `/event/types`
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
  "active": "<boolean>",
  "booking_method": "<string>",
  "slug": "<string | null>",
  "scheduling_url": "<string>",
  "duration": "<number>",
  "kind": "<string>",
  "pooling_type": "<string | null>",
  "type": "<string>",
  "color": "<string>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "internal_note": "<string | null>",
  "description_plain": "<string>",
  "description_html": "<string>",
  "profile": "<Profile | null>",
  "secret": "<boolean>",
  "deleted_at": "<string | null>",
  "admin_managed": "<boolean>",
  "locations": "<EventTypeLocation[] | null>",
  "custom_questions": [
    {
      "name": "<string>",
      "type": "<string>",
      "position": "<number>",
      "enabled": "<boolean>",
      "required": "<boolean>",
      "answer_choices": [
        "<string>"
      ],
      "include_other": "<boolean>"
    }
  ],
  "position": "<number>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/event-types.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/event-types.md)

<!-- END  GENERATED CONTENT -->

undefined