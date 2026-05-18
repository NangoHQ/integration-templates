import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Apollo ID for the account. Example: "6a0af1f0c9f63c0018aed306"')
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    phone: z.string().optional(),
    raw_address: z.string().optional(),
    owner_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional(),
    organization: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            domain: z.string().optional()
        })
        .optional()
});

const ApiResponseSchema = z.object({
    account: AccountSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    phone: z.string().optional(),
    raw_address: z.string().optional(),
    owner_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional(),
    organization: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            domain: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single account from Apollo.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-account'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/view-an-account
        const response = await nango.get({
            endpoint: `/v1/accounts/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account not found',
                id: input.id
            });
        }

        const parsedResponse = ApiResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from API',
                id: input.id
            });
        }

        const account = parsedResponse.data.account;

        return {
            id: account.id,
            ...(account.name !== undefined && { name: account.name }),
            ...(account.domain !== undefined && { domain: account.domain }),
            ...(account.phone !== undefined && { phone: account.phone }),
            ...(account.raw_address !== undefined && { raw_address: account.raw_address }),
            ...(account.owner_id !== undefined && { owner_id: account.owner_id }),
            ...(account.account_stage_id !== undefined && { account_stage_id: account.account_stage_id }),
            ...(account.created_at !== undefined && { created_at: account.created_at }),
            ...(account.updated_at !== undefined && { updated_at: account.updated_at }),
            ...(account.typed_custom_fields !== undefined && { typed_custom_fields: account.typed_custom_fields }),
            ...(account.organization !== undefined && { organization: account.organization })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
