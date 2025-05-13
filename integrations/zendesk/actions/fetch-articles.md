<!-- BEGIN GENERATED CONTENT -->
# Fetch Articles

## General Information

- **Description:** Fetch all help center articles metadata
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `hc:read`
- **Endpoint Type:** Action
- **Model:** `ArticleResponse`
- **Input Model:** _None_
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/fetch-articles.ts)


## Endpoint Reference

### Request Endpoint

`GET /all-articles`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "articles": [
    {
      "title": "<string>",
      "id": "<string>",
      "url": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/fetch-articles.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/fetch-articles.md)

<!-- END  GENERATED CONTENT -->

