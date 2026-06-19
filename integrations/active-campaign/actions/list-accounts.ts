import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page (default 20, max 100).'),
    search: z.string().optional().describe('Search accounts by name.')
});

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountUrl: z.string().nullable().optional(),
    createdTimestamp: z.string().nullable().optional(),
    updatedTimestamp: z.string().nullable().optional(),
    contactCount: z.string().nullable().optional(),
    dealCount: z.string().nullable().optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    accounts: z.array(z.unknown()),
    meta: z
        .object({
            total: z.string().or(z.number()).optional()
        })
        .optional()
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountUrl: z.string().optional(),
    createdTimestamp: z.string().optional(),
    updatedTimestamp: z.string().optional(),
    contactCount: z.string().optional(),
    dealCount: z.string().optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(AccountSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List accounts from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let offset = 0;
        if (input.cursor) {
            const parsed = parseInt(input.cursor, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                offset = parsed;
            }
        }

        const params: Record<string, string | number> = {
            offset
        };

        if (input['limit'] !== undefined) {
            params['limit'] = input['limit'];
        }

        if (input['search'] !== undefined && input['search'] !== '') {
            params['search'] = input['search'];
        }

        const response = await nango.get({
            // https://developers.activecampaign.com/reference/list-all-accounts
            endpoint: '/3/accounts',
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from ActiveCampaign API'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);
        const total = typeof providerData.meta?.total === 'string' ? parseInt(providerData.meta.total, 10) : (providerData.meta?.total ?? 0);
        const nextOffset = offset + providerData.accounts.length;
        const next_cursor = nextOffset < total ? String(nextOffset) : undefined;

        return {
            items: providerData.accounts.map((item) => {
                const providerAccount = ProviderAccountSchema.parse(item);
                return {
                    id: providerAccount.id,
                    name: providerAccount.name,
                    ...(providerAccount.accountUrl != null && { accountUrl: providerAccount.accountUrl }),
                    ...(providerAccount.createdTimestamp != null && { createdTimestamp: providerAccount.createdTimestamp }),
                    ...(providerAccount.updatedTimestamp != null && { updatedTimestamp: providerAccount.updatedTimestamp }),
                    ...(providerAccount.contactCount != null && { contactCount: providerAccount.contactCount }),
                    ...(providerAccount.dealCount != null && { dealCount: providerAccount.dealCount }),
                    ...(providerAccount.links !== undefined && { links: providerAccount.links })
                };
            }),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
