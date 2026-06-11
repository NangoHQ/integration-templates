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

function getMailBaseUrl(connection: unknown): string {
    const extension =
        typeof connection === 'object' &&
        connection !== null &&
        'connection_config' in connection &&
        typeof connection.connection_config === 'object' &&
        connection.connection_config !== null &&
        'extension' in connection.connection_config &&
        typeof connection.connection_config.extension === 'string'
            ? connection.connection_config.extension
            : null;

    if (extension === 'com') {
        return 'https://mail.zoho.com';
    }
    if (extension === 'eu') {
        return 'https://mail.zoho.eu';
    }
    if (extension === 'in') {
        return 'https://mail.zoho.in';
    }
    if (extension === 'com.au') {
        return 'https://mail.zoho.com.au';
    }
    if (extension === 'jp') {
        return 'https://mail.zoho.jp';
    }
    if (extension === 'ca') {
        return 'https://mail.zohocloud.ca';
    }
    if (extension === 'com.cn') {
        return 'https://mail.zoho.com.cn';
    }
    if (extension === 'ae') {
        return 'https://mail.zoho.ae';
    }
    if (extension === 'sa') {
        return 'https://mail.zoho.sa';
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
