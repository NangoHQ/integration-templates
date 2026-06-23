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

const port = Number(process.env.PORT || 3000);
const apiKey = process.env.STS_SHARED_API_KEY;

if (!apiKey) {
    throw new Error('STS_SHARED_API_KEY must be set');
}

const stsRegion = process.env.AWS_REGION || 'us-east-1';
const stsClient = new STS({ region: stsRegion });

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', region: stsRegion });
});

app.post('/assume-role', async (req, res) => {
    if (req.header('x-api-key') !== apiKey) {
        return res.status(401).json({ error: 'invalid_api_key' });
    }

    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const response = await stsClient.assumeRole({
            RoleArn: parsed.data.role_arn,
            RoleSessionName: `nango-${Date.now()}`,
            ExternalId: parsed.data.external_id,
            DurationSeconds: 3600
        });

        if (!response.Credentials) {
            return res.status(500).json({ error: 'sts_missing_credentials' });
        }

        res.json({
            accessKeyId: response.Credentials.AccessKeyId,
            secretAccessKey: response.Credentials.SecretAccessKey,
            sessionToken: response.Credentials.SessionToken,
            expiresAt: response.Credentials.Expiration
        });
    } catch (err) {
        console.error('Failed to assume role', err);
        res.status(500).json({ error: 'assume_role_failed' });
    }
});

app.listen(port, () => {
    console.log(`aws-sts listening on port ${port}`);
});
