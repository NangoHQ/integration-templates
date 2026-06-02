import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['AUTH0_CONNECTION_ID'] || 'auth0-cc';
const providerConfigKey = process.env['AUTH0_PROVIDER_CONFIG_KEY'] ?? 'auth0-cc';

async function run(input: {
    connection_id: string;
    users: string; // JSON string of user objects array
    upsert?: boolean;
    send_completion_email?: boolean;
}) {
    const token = await nango.getToken(providerConfigKey, connectionId);
    let accessToken: string;
    if (typeof token === 'string') {
        accessToken = token;
    } else if (token !== null && typeof token === 'object' && 'token' in token && typeof token.token === 'string') {
        accessToken = token.token;
    } else {
        throw new Error('Unable to retrieve access token for Auth0 connection.');
    }

    // Extract Auth0 tenant hostname from the JWT issuer claim
    const payload = accessToken.split('.')[1];
    if (!payload) {
        throw new Error('Invalid access token: missing payload.');
    }
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || !('iss' in parsed) || typeof parsed.iss !== 'string') {
        throw new Error('Unable to determine Auth0 hostname from token: missing iss claim.');
    }
    const hostname = new URL(parsed.iss).hostname;

    const formData = new FormData();
    formData.append('connection_id', input.connection_id);
    if (input.upsert !== undefined) {
        formData.append('upsert', String(input.upsert));
    }
    if (input.send_completion_email !== undefined) {
        formData.append('send_completion_email', String(input.send_completion_email));
    }
    const blob = new Blob([input.users], { type: 'application/json' });
    formData.append('users', blob, 'users.json');

    // https://auth0.com/docs/api/management/v2/jobs/post-users-imports
    // Retry up to 3 times with exponential backoff for transient failures.
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
        }
        try {
            const response = await fetch(`https://${hostname}/api/v2/jobs/users-imports`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData
            });
            if (response.ok) {
                return await response.json();
            }
            const errorBody = await response.text();
            lastError = new Error(`Auth0 returned ${response.status}: ${errorBody}`);
            if (response.status < 500) {
                break;
            }
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
        }
    }
    throw lastError;
}

const input = {
    connection_id: 'con_0000000000000001',
    users: JSON.stringify([{ email: 'user@example.com', email_verified: true, connection: 'Username-Password-Authentication' }])
};

nango.log(await run(input));
