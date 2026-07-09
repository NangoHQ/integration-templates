import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('The unique identifier of the ad account. Example: "549770573673"')
});

const ProviderAdAccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    owner: z
        .object({
            id: z.string().optional(),
            username: z.string().optional()
        })
        .optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    timezone_id: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    is_partner: z.boolean().optional(),
    is_shared_partner: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    owner: z
        .object({
            id: z.string().optional(),
            username: z.string().optional()
        })
        .optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    timezone_id: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    is_partner: z.boolean().optional(),
    is_shared_partner: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve an ad account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ad account not found',
                ad_account_id: input.ad_account_id
            });
        }

        const account = ProviderAdAccountSchema.parse(response.data);

        return {
            id: account.id,
            ...(account.name !== undefined && { name: account.name }),
            ...(account.owner !== undefined && {
                owner: {
                    ...(account.owner.id !== undefined && { id: account.owner.id }),
                    ...(account.owner.username !== undefined && { username: account.owner.username })
                }
            }),
            ...(account.country !== undefined && { country: account.country }),
            ...(account.currency !== undefined && { currency: account.currency }),
            ...(account.timezone_id !== undefined && { timezone_id: account.timezone_id }),
            ...(account.status !== undefined && { status: account.status }),
            ...(account.type !== undefined && { type: account.type }),
            ...(account.permissions !== undefined && { permissions: account.permissions }),
            ...(account.is_partner !== undefined && { is_partner: account.is_partner }),
            ...(account.is_shared_partner !== undefined && { is_shared_partner: account.is_shared_partner })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
