# AWS SigV4 End-to-End Validation Guide

This document describes how to validate the AWS SigV4 proxy flow locally using:

- The Nango monorepo (cloned locally)
- A customer-hosted STS helper (this project)
- An AWS account with appropriate permissions

The goal is to prove that Nango can:

1. Launch locally (UI, Connect, proxy)
2. Fetch temporary credentials from the STS helper using an ExternalId
3. Proxy a signed request to AWS (listing objects in an S3 bucket)

---

## 0. Prerequisites

| Requirement | Details |
| --- | --- |
| Tooling | Node 20+, npm 10+, Docker Desktop, AWS CLI v2, `jq` |
| Local repos | Nango monorepo (cloned), this STS helper project |
| AWS access | An AWS profile configured via `aws configure --profile <YOUR_PROFILE>` with sufficient permissions |
| Ports | Ensure 3000–3010 and 3055 are free locally. |

> All AWS CLI commands below assume you have exported `AWS_PROFILE=<YOUR_PROFILE>` pointing to your AWS account. Export that profile once before starting the IAM setup steps.

---

## 1. AWS resources

### 1.1 Demo S3 bucket

Create a target S3 bucket to verify the proxy request:

```bash
aws s3api create-bucket \
    --bucket <YOUR_BUCKET_NAME> \
    --region us-east-2 \
    --create-bucket-configuration LocationConstraint=us-east-2

# Upload a seed object
echo "demo object created $(date)" > /tmp/demo.txt
aws s3 cp /tmp/demo.txt s3://<YOUR_BUCKET_NAME>/seed/demo.txt --region us-east-2
```

You can confirm from your terminal:

```bash
aws s3api list-objects-v2 --bucket <YOUR_BUCKET_NAME>
```

Keep this bucket name handy; the proxied request will call `ListObjectsV2` against it.

### 1.2 IAM identities (must exist before running Connect)

Use your AWS profile for all of the following commands. Replace `<ACCOUNT_ID>` with your 12-digit AWS account ID.

> We recommend keeping the infrastructure-as-code files under the `infra/` directory so both you and the STS container share the same setup source.

1. **STS service IAM user (`NangoSigV4StsUser`)**
   ```bash
   aws iam create-user --user-name NangoSigV4StsUser

   aws iam put-user-policy \
       --user-name NangoSigV4StsUser \
       --policy-name AllowAssumeSigV4DemoRole \
       --policy-document '{
           "Version": "2012-10-17",
           "Statement": [
               {
                   "Effect": "Allow",
                   "Action": "sts:AssumeRole",
                   "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/NangoSigV4DemoRole"
               }
           ]
       }'

   aws iam create-access-key --user-name NangoSigV4StsUser
   ```

   Capture the `AccessKeyId` and `SecretAccessKey`; they feed the STS Docker container via `.env`.

2. **Customer role (`NangoSigV4DemoRole`)**
   ```bash
   cat <<'JSON' >/tmp/nango-sigv4-trust.json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": { "AWS": "arn:aws:iam::<ACCOUNT_ID>:user/NangoSigV4StsUser" },
         "Action": "sts:AssumeRole",
         "Condition": { "StringEquals": { "sts:ExternalId": "${externalId}" } }
       }
     ]
   }
   JSON

   aws iam create-role \
       --role-name NangoSigV4DemoRole \
       --assume-role-policy-document file:///tmp/nango-sigv4-trust.json

   aws iam put-role-policy \
       --role-name NangoSigV4DemoRole \
       --policy-name AllowSigV4BucketOps \
       --policy-document "{
           \"Version\":\"2012-10-17\",
           \"Statement\":[
               {\"Effect\":\"Allow\",\"Action\":[\"s3:ListBucket\"],\"Resource\":\"arn:aws:s3:::<YOUR_BUCKET_NAME>\"},
               {\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::<YOUR_BUCKET_NAME>/*\"}
           ]
       }"
   ```

> The trust policy enforces ExternalId, so Connect's generated value must be used. The STS container just forwards whatever Nango provides; no static value is stored.

Record the following **final values** (you'll enter them in Connect and the `.env` files later):

| Field | Example / Notes |
| --- | --- |
| `STS_SERVICE_ACCESS_KEY_ID` | Output from `create-access-key` |
| `STS_SERVICE_SECRET_ACCESS_KEY` | Output from `create-access-key` |
| `ASSUMABLE_ROLE_ARN` | `arn:aws:iam::<ACCOUNT_ID>:role/NangoSigV4DemoRole` |
| `STS_SERVICE_REGION` | Typically `us-east-2` so S3 + role live together |

### 1.3 Host the CloudFormation template

Quick Create links require a publicly accessible template URL. Upload the provided file to the bucket and ensure CORS is open so the Nango UI can fetch the template to auto-hydrate parameters.

```bash
# Allow public reads for this bucket (demo only)
aws s3api delete-public-access-block --bucket <YOUR_BUCKET_NAME> --region us-east-2

# Upload the template object
aws s3 cp infra/cloudformation/s3-readonly.json \
    s3://<YOUR_BUCKET_NAME>/templates/s3-readonly.json \
    --region us-east-2

# Enable permissive CORS so the UI can fetch and parse the template body
aws s3api put-bucket-cors --bucket <YOUR_BUCKET_NAME> --region us-east-2 --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": [],
      "MaxAgeSeconds": 300
    }
  ]
}'
```

The template URL you will reference later is:

```
https://<YOUR_BUCKET_NAME>.s3.us-east-2.amazonaws.com/templates/s3-readonly.json
```

> For production, keep Block Public Access enabled and serve templates using a controlled mechanism (e.g., signed URLs or a dedicated distribution). You can also scope CORS to your app origins instead of `*`.

---

## 2. Build and run the STS helper

We use a minimal Express app that proxies requests to AWS STS. Project layout:

```
aws-sts/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── src/
│   └── server.ts
└── .env
```

### 2.1 Bootstrap the repo

```bash
npm init -y
npm install express cors body-parser @aws-sdk/client-sts zod
npm install -D ts-node-dev typescript @types/express @types/node
npx tsc --init --rootDir src --outDir dist --esModuleInterop
```

### 2.2 Sample `src/server.ts`

```ts
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { STS } from '@aws-sdk/client-sts';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const requestSchema = z.object({
    role_arn: z.string().min(1),
    external_id: z.string().min(1),
    region: z.string().min(1),
    service: z.string().min(1)
});

const sts = new STS({ region: process.env.AWS_REGION });
const apiKey = process.env.STS_SHARED_API_KEY!;

app.post('/assume-role', async (req, res) => {
    if (req.header('x-api-key') !== apiKey) {
        return res.status(401).json({ error: 'invalid_api_key' });
    }

    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const assumed = await sts.assumeRole({
            RoleArn: parsed.data.role_arn,
            RoleSessionName: `nango-${Date.now()}`,
            ExternalId: parsed.data.external_id,
            DurationSeconds: 3600
        });

        return res.json({
            accessKeyId: assumed.Credentials?.AccessKeyId,
            secretAccessKey: assumed.Credentials?.SecretAccessKey,
            sessionToken: assumed.Credentials?.SessionToken,
            expiresAt: assumed.Credentials?.Expiration
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'assume_role_failed' });
    }
});

const port = process.env.PORT ?? 3055;
app.listen(port, () => {
    console.log(`STS helper listening on ${port}`);
});
```

### 2.3 Docker + compose

`Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]
```

`docker-compose.yml`

```yaml
version: '3.8'
services:
  aws-sts:
    build: .
    ports:
      - "3055:3000"
    environment:
      - PORT=3000
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - STS_SHARED_API_KEY=${STS_SHARED_API_KEY}
```

`.env`

```
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<STS_SERVICE_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<STS_SERVICE_SECRET_ACCESS_KEY>
STS_SHARED_API_KEY=<YOUR_API_KEY>
```

### 2.4 Build & run

```bash
docker compose up --build
# Service listens on http://localhost:3055/assume-role
```

Leave this container running before launching the Connect flow.

---

## 3. Run Nango locally

1. **Environment variables**
   ```bash
   cd <path-to-nango-monorepo>
   cp .env.example .env
   # set DB + server ports as needed; defaults are fine
   ```

2. **Dev dependencies (Postgres + Redis)**
   ```bash
   docker compose up -d nango-db nango-redis
   ```

3. **Install & run the monorepo**
   ```bash
   npm install
   npm run dev:watch:apps
   ```

   - Server/API: http://localhost:3003
   - Dashboard: http://localhost:3000
   - Connect UI: http://localhost:3009

4. **Initial account**
   - Visit http://localhost:3000
   - Create a root account + environment
   - Generate an **Environment Secret Key** (under Settings → Environments) — needed for API calls.

---

## 4. Configure the AWS SigV4 integration (Dashboard)

1. Navigate to **Integrations → Add Integration** and choose **AWS SigV4**.
2. Set a unique provider config key (for example `aws-sigv4-demo`) and click **Create**.
3. Open the new integration and go to **Settings → General → AWS SigV4 Settings**. Enter:
   - **AWS Service:** `s3`
   - **Default Region:** `us-east-2`
   - **STS Endpoint URL:** `http://localhost:3055/assume-role`
   - **STS Auth:** API key header, header name `x-api-key`, value `<YOUR_API_KEY>`
4. In **CloudFormation Templates** click **Add template** and fill in:
   - Template ID `s3-readonly`
   - Display label `AWS S3 Read Only`
   - Stack name `NangoSigV4Demo`
   - Description `Creates the demo IAM role for the validation flow`
   - Template URL: `https://<YOUR_BUCKET_NAME>.s3.us-east-2.amazonaws.com/templates/s3-readonly.json`
   - Click **Load template** to fetch and auto-populate required parameters, then set values:
     - `TrustedAccountId` = `<ACCOUNT_ID>`
     - `TrustedUserName` = `NangoSigV4StsUser`
     - `BucketName` = `<YOUR_BUCKET_NAME>`
   - _Reminder:_ this template intentionally omits the ExternalId condition so it is easy to validate locally. Lock it down before using it with real customers.
5. Click **Save AWS SigV4 Settings**.

At this point the integration page will show the new template button in its Connect preview.

---

## 5. Create a Connect session (UI-first)

1. In the dashboard, open your `aws-sigv4-demo` integration and switch to the **Connect Sessions** tab (or use **Connect → Sessions** from the sidebar).
2. Click **Create Connect Session**.
3. Fill the form with:
   - Integration: `aws-sigv4-demo`
   - End user ID `demo-user-001`, email `demo@example.com`
   - Success URL `https://example.com/success`
   - Error URL `https://example.com/error`
4. Click **Create session** and copy the generated connect link.
5. Open that link in a browser (this is the same URL you would send to a customer).

_CLI alternative:_ if you need to automate later, keep the curl snippet from the previous version of this guide. For the manual validation, the UI flow above is preferred.

---

## 6. Complete the Connect flow

1. The Connect UI shows the template card you configured earlier plus the credential form.
2. In a separate browser tab sign in to the AWS console using your AWS credentials. Once signed in, return to the Connect link and click **AWS S3 Read Only**. AWS CloudFormation's Quick Create page opens with the template body, stack name, and parameters pre-filled.
3. Deploy the stack in your AWS account. After it succeeds, copy the `RoleArn` output (e.g., `arn:aws:iam::<ACCOUNT_ID>:role/<STACK_NAME>-SigV4Role`).
4. Return to the Connect form, paste the IAM Role ARN, and keep the region as `us-east-2` (or override it).
5. Submit the form. During submission Nango:
   - Generates a unique ExternalId and stores it in the connection config.
   - Calls the STS helper at `http://localhost:3055/assume-role`.
   - Verifies the assumed credentials via `GetCallerIdentity`.
6. When the flow succeeds you land on the Success URL and the new connection appears in the dashboard under the integration. Open it and note the **Connection ID**; you'll need it for the proxy test.

---

## 7. Validate the proxy request

### 7.1 Build the payload

Before running the proxy test, copy the **Environment Secret Key** from **Settings → Environments** in the dashboard and grab the **Connection ID** from the connection details page (Integrations → AWS SigV4 → Connections → your new connection). Use those values below.

```bash
ENV_SECRET=<paste-from-dashboard>
CONNECTION_ID=<value from Connect>

curl -s -X GET "http://localhost:3003/proxy/<YOUR_BUCKET_NAME>?list-type=2" \
    -H "Authorization: Bearer ${ENV_SECRET}" \
    -H "provider-config-key: aws-sigv4" \
    -H "connection-id: ${CONNECTION_ID}"
```

Expected response (abbreviated):

```json
{
  "data": {
    "Contents": [
      {
        "Key": "seed/demo.txt",
        "Size": 44
      }
    ]
  },
  "status": 200
}
```

This proves that:

- Nango refreshed credentials through the STS helper
- The proxy signed the request with AWS SigV4
- AWS S3 returned the object listing using the role permissions

### 7.2 (Optional) Fetch the seed object

```bash
curl -s -X GET "http://localhost:3003/proxy/<YOUR_BUCKET_NAME>/seed/demo.txt" \
    -H "Authorization: Bearer ${ENV_SECRET}" \
    -H "provider-config-key: aws-sigv4" \
    -H "connection-id: ${CONNECTION_ID}"
```

You should see the message `demo object created <timestamp>`.

---

## 8. Troubleshooting checklist

- **Connect fails before verifying credentials:** Check the STS container logs to confirm the API key header and AWS credentials are correct.
- **`GetCallerIdentity` errors:** Ensure the IAM trust policy in §1.2 matches the `ExternalId` shown in the connection's metadata. The ExternalId rotates per connection.
- **Proxy 403s:** Verify the role policy allows `s3:ListBucket` and `s3:GetObject` on your bucket.
- **Docker networking:** If Nango runs inside Docker instead of via `npm run dev:watch:apps`, use `http://host.docker.internal:3055/assume-role` for the STS URL so the container can reach the host port.

Following the steps above results in a full end-to-end validation: local UI, Connect magic link, STS credential exchange, and a signed proxied request hitting your demo S3 bucket.
