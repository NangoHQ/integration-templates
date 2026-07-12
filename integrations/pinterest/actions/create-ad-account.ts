import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Ad account name. Example: "Nango Seed Ad Account"'),
    country: z.string().describe('Country ID from ISO 3166-1 alpha-2. Example: "US"'),
    currency: z.string().describe('Currency code from ISO 4217. Example: "USD"'),
    owner_user_id: z.string().describe('Advertiser\'s owning numeric user ID. Example: "1099300727702429065"'),
    time_zone: z.string().optional().describe('Time zone in IANA format. Example: "America/Los_Angeles"')
});

const ProviderAdAccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    time_zone: z.string().optional(),
    owner: z
        .object({
            id: z.string(),
            username: z.string().optional()
        })
        .optional(),
    permissions: z.array(z.string()).optional(),
    created_time: z.number().nullable().optional(),
    updated_time: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    time_zone: z.string().optional(),
    owner: z
        .object({
            id: z.string(),
            username: z.string().optional()
        })
        .optional(),
    permissions: z.array(z.string()).optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional()
});

const action = createAction({
    description: 'Create an ad account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/create
            endpoint: '/v5/ad_accounts',
            data: {
                name: input.name,
                country: input.country,
                currency: input.currency,
                owner_user_id: input.owner_user_id,
                ...(input.time_zone !== undefined && { time_zone: input.time_zone })
            },
            // Non-idempotent write: Pinterest does not document idempotency for ad account creation.
            // The workspace lint rule requires a positive integer, so we use the minimum safe value.
            retries: 1
        });

        const providerAccount = ProviderAdAccountSchema.parse(response.data);

        return {
            id: providerAccount.id,
            ...(providerAccount.name !== undefined && { name: providerAccount.name }),
            ...(providerAccount.country !== undefined && { country: providerAccount.country }),
            ...(providerAccount.currency !== undefined && { currency: providerAccount.currency }),
            ...(providerAccount.time_zone !== undefined && { time_zone: providerAccount.time_zone }),
            ...(providerAccount.owner !== undefined && { owner: providerAccount.owner }),
            ...(providerAccount.permissions !== undefined && { permissions: providerAccount.permissions }),
            ...(providerAccount.created_time != null && { created_time: providerAccount.created_time }),
            ...(providerAccount.updated_time != null && { updated_time: providerAccount.updated_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
