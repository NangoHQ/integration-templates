<!-- BEGIN GENERATED CONTENT -->
# Conversation

## General Information

- **Description:** List the messages in a conversation in reverse chronological order (newest first).
- **Version:** 2.0.0
- **Group:** Conversations
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_front_conversation`
- **Input Model:** `ActionInput_front_conversation`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/front/actions/conversation.ts)


## Endpoint Reference

### Request Endpoint

`GET /conversations/all`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "query": {
    "limit?": "<number>",
    "page_token?": "<string>",
    "sort_by?": "<string>",
    "sort_order?": "<enum: 'asc' | 'desc'>"
  }
}
```

### Request Response

```json
{
  "messages": [
    {
      "_links": {
        "self": "<string>",
        "related": {
          "conversation": "<string>",
          "message_replied_to?": "<string>",
          "message_seen": "<string>"
        }
      },
      "id": "<string>",
      "version?": "<string | null>",
      "blurb": "<string>",
      "error_type": "<string | null>",
      "type": "<enum: 'call' | 'custom' | 'email' | 'facebook' | 'front_chat' | 'googleplay' | 'intercom' | 'internal' | 'phone-call' | 'sms' | 'tweet' | 'tweet_dm' | 'whatsapp' | 'yalo_wha'>",
      "is_draft": "<boolean>",
      "is_inbound": "<boolean>",
      "draft_mode": "<string | null>",
      "created_at": "<number>",
      "subject": "<string>",
      "author": "<{\"_links\":{\"self\":\"<string>\",\"related\":{\"inboxes\":\"<string>\",\"conversations\":\"<string>\"}},\"id\":\"<string>\",\"email\":\"<string>\",\"username\":\"<string>\",\"first_name\":\"<string>\",\"last_name\":\"<string>\",\"is_admin\":\"<boolean>\",\"is_blocked\":\"<boolean>\",\"custom_fields\":{}} | <null>>",
      "recipients": [
        {
          "_links": {
            "related": {
              "contact": "<string>"
            }
          },
          "name": "<string>",
          "handle": "<string>",
          "role": "<enum: 'from' | 'to' | 'cc' | 'bcc'>"
        }
      ],
      "body": "<string>",
      "text": "<string>",
      "attachments?": [
        {
          "id": "<string>",
          "filename": "<string>",
          "url": "<string>",
          "content_type": "<string>",
          "size": "<number>",
          "metadata": {
            "is_inline": "<boolean>",
            "cid": "<string>"
          }
        }
      ],
      "signature?": "<{\"_links?\":{\"related?\":{\"owner?\":\"<string>\"}},\"id?\":\"<string>\",\"name?\":\"<string>\",\"body?\":\"<string>\",\"sender_info?\":\"<string>\",\"is_visible_for_all_teammate_channels?\":\"<boolean>\",\"is_default?\":\"<boolean>\",\"is_private?\":\"<boolean>\",\"channel_ids?\":\"<string[]>\"} | <null>>",
      "metadata?": {
        "intercom_url?": "<string>",
        "duration?": "<number>",
        "have_been_answered?": "<boolean>",
        "external_id?": "<string>",
        "twitter_url?": "<string>",
        "is_retweet?": "<boolean>",
        "have_been_retweeted?": "<boolean>",
        "have_been_favorited?": "<boolean>",
        "thread_ref?": "<string>",
        "headers?": {},
        "chat_visitor_url?": "<string>"
      }
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/actions/conversation.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/actions/conversation.md)

<!-- END  GENERATED CONTENT -->

