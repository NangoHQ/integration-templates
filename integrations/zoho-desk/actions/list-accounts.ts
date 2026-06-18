import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of accounts to fetch. Defaults to 50.')
});

const CustomerHappinessSchema = z.object({
    badPercentage: z.string().optional(),
    okPercentage: z.string().optional(),
    goodPercentage: z.string().optional()
});

const ProviderAccountSchema = z
    .object({
        id: z.string(),
        accountName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        webUrl: z.string().optional(),
        createdTime: z.string().optional(),
        modifiedTime: z.string().optional(),
        zohoCRMAccount: z.string().nullable().optional(),
        customerHappiness: CustomerHappinessSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown())
});

const AccountSchema = z.object({
    id: z.string(),
    accountName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    webUrl: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    zohoCRMAccount: z.string().nullable().optional(),
    customerHappiness: CustomerHappinessSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(AccountSchema),
    next_cursor: z.string().optional()
});

const MetadataSchema = z.object({
    orgId: z.string().optional()
});

const action = createAction({
    description: 'List accounts.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.basic.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const from = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor !== undefined && (Number.isNaN(from) || from < 0)) {
            throw new nango.ActionError({ type: 'invalid_input', message: 'cursor must be a non-negative integer string' });
        }
        const limit = Math.min(Math.max(Math.floor(input.limit ?? 50), 1), 100);

        const connection = await nango.getConnection();
        const extension =
            connection &&
            typeof connection === 'object' &&
            'connection_config' in connection &&
            connection.connection_config &&
            typeof connection.connection_config === 'object' &&
            'extension' in connection.connection_config &&
            typeof connection.connection_config['extension'] === 'string'
                ? connection.connection_config['extension']
                : undefined;
        const baseUrl = extension !== undefined ? `https://desk.zoho.${extension}` : undefined;

        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);

        const response = await nango.get({
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: '/api/v1/accounts',
            ...(baseUrl !== undefined && { baseUrlOverride: baseUrl }),
            params: {
                from: String(from),
                limit: String(limit)
            },
            headers: {
                ...(metadata.orgId !== undefined && { orgId: metadata.orgId })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.data.map((item: unknown) => {
            const account = ProviderAccountSchema.parse(item);
            return {
                id: account.id,
                ...(account.accountName !== undefined && { accountName: account.accountName }),
                ...(account.email !== undefined && { email: account.email }),
                ...(account.phone !== undefined && { phone: account.phone }),
                ...(account.website !== undefined && { website: account.website }),
                ...(account.webUrl !== undefined && { webUrl: account.webUrl }),
                ...(account.createdTime !== undefined && { createdTime: account.createdTime }),
                ...(account.modifiedTime !== undefined && { modifiedTime: account.modifiedTime }),
                ...(account.zohoCRMAccount !== undefined && { zohoCRMAccount: account.zohoCRMAccount }),
                ...(account.customerHappiness !== undefined && { customerHappiness: account.customerHappiness })
            };
        });

        const nextCursor = items.length === limit ? String(from + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
