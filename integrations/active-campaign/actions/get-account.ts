import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Account ID. Example: 1')
});

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountUrl: z.string().nullable().optional(),
    createdTimestamp: z.string().nullable().optional(),
    updatedTimestamp: z.string().nullable().optional(),
    links: z.unknown().optional()
});

const ProviderResponseSchema = z.object({
    account: ProviderAccountSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountUrl: z.string().optional(),
    createdTimestamp: z.string().optional(),
    updatedTimestamp: z.string().optional(),
    links: z.unknown().optional()
});

const action = createAction({
    description: 'Retrieve a single account from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/retrieve-an-account
            endpoint: `/3/accounts/${encodeURIComponent(String(input.id))}`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerData = ProviderResponseSchema.parse(response.data);
        const account = providerData.account;

        return {
            id: account.id,
            name: account.name,
            ...(account.accountUrl != null && { accountUrl: account.accountUrl }),
            ...(account.createdTimestamp != null && { createdTimestamp: account.createdTimestamp }),
            ...(account.updatedTimestamp != null && { updatedTimestamp: account.updatedTimestamp }),
            ...(account.links !== undefined && { links: account.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
