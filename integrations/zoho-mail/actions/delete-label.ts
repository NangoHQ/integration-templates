import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Account ID. Example: "4845214000000008002"'),
    labelId: z.string().describe('Label ID. Example: "1234567890123456789"')
});

const ProviderStatusSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    })
});

const OutputSchema = z.object({
    success: z.boolean()
});

const extensionToMailBase: Record<string, string> = {
    com: 'https://mail.zoho.com',
    eu: 'https://mail.zoho.eu',
    in: 'https://mail.zoho.in',
    'com.au': 'https://mail.zoho.com.au',
    jp: 'https://mail.zoho.jp',
    ca: 'https://mail.zohocloud.ca',
    'com.cn': 'https://mail.zoho.com.cn',
    ae: 'https://mail.zoho.ae',
    sa: 'https://mail.zoho.sa'
};

function getMailBaseUrl(connection: unknown): string {
    if (typeof connection !== 'object' || connection === null) {
        return 'https://mail.zoho.com';
    }

    const config =
        'connection_config' in connection && typeof connection.connection_config === 'object' && connection.connection_config !== null
            ? connection.connection_config
            : null;

    if (config && 'extension' in config && typeof config.extension === 'string') {
        return extensionToMailBase[config.extension] ?? 'https://mail.zoho.com';
    }

    const apiDomain =
        config && 'api_domain' in config && typeof config.api_domain === 'string'
            ? config.api_domain
            : (() => {
                  const creds =
                      'credentials' in connection && typeof connection.credentials === 'object' && connection.credentials !== null
                          ? connection.credentials
                          : null;
                  const raw = creds && 'raw' in creds && typeof creds.raw === 'object' && creds.raw !== null ? creds.raw : null;
                  return raw && 'api_domain' in raw && typeof raw.api_domain === 'string' ? raw.api_domain : null;
              })();

    if (apiDomain) {
        const trimmed = apiDomain.replace(/\/$/, '');
        const apisMatch = trimmed.match(/^https:\/\/www\.zohoapis\.([a-z.]+)$/);
        if (apisMatch) {
            const ext = apisMatch[1]!;
            return extensionToMailBase[ext] ?? `https://mail.zoho.${ext}`;
        }
    }

    return 'https://mail.zoho.com';
}

const action = createAction({
    description: 'Delete a label in Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tags.ALL', 'ZohoMail.tags.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const baseUrl = getMailBaseUrl(connection);

        const response = await nango.delete({
            // https://www.zoho.com/mail/help/api/delete-label.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/labels/${encodeURIComponent(input.labelId)}`,
            baseUrlOverride: baseUrl,
            retries: 3
        });

        const providerStatus = ProviderStatusSchema.safeParse(response.data);
        if (!providerStatus.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Mail API',
                data: response.data
            });
        }

        return {
            success: providerStatus.data.status.code === 200
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
