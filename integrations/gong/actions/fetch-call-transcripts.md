<!-- BEGIN GENERATED CONTENT -->
# Fetch Call Transcripts

## General Information

- **Description:** Fetches a list of call transcripts from Gong
- **Version:** 2.0.0
- **Group:** Calls
- **Scopes:** `api:calls:read:transcript`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_gong_fetchcalltranscripts`
- **Input Model:** `ActionInput_gong_fetchcalltranscripts`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gong/actions/fetch-call-transcripts.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-call-transcripts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "from?": "<string>",
  "to?": "<string>",
  "workspace_id?": "<string>",
  "call_id?": "<string[]>",
  "cursor?": "<string>"
}
```

### Request Response

```json
{
  "next_cursor?": "<string>",
  "transcript": [
    {
      "call_id": "<string>",
      "transcript": [
        {
          "speaker_id": "<string>",
          "topic": "<string | null>",
          "sentences": [
            {
              "start": "<number>",
              "end": "<number>",
              "text": "<string>"
            }
          ]
        }
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gong/actions/fetch-call-transcripts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gong/actions/fetch-call-transcripts.md)

<!-- END  GENERATED CONTENT -->
The response is paginated. To retrieve subsequent pages, use the `next_cursor` value from the response as the `cursor` parameter in your next request.
