# Get Company Details

Retrieves detailed information about the current company in Bitdefender GravityZone.

## API Documentation

[Bitdefender API Documentation - getCompanyDetails](https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html)

## Request

This action does not require any input parameters.

## Response

Returns company details including ID, name, type, country, and subscribed services.

```typescript
{
  id: string;
  name: string;
  type: number;
  country: string | undefined;
  createdAt: string;
  subscribedServices: {
    endpoint: boolean;
    exchange: boolean;
    network: boolean;
    sos: boolean;
  };
  raw_json: string;
}
```

## Example

```typescript
// Example response
{
  "id": "company-123",
  "name": "Nango Inc",
  "type": 0,
  "country": "United States",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "subscribedServices": {
    "endpoint": true,
    "exchange": false,
    "network": true,
    "sos": false
  },
  "raw_json": "{\"id\":\"company-123\",\"name\":\"Nango Inc\",\"type\":0,\"country\":\"United States\",\"subscribedServices\":{\"endpoint\":true,\"exchange\":false,\"network\":true,\"sos\":false}}"
}
```
