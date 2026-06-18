import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Apollo ID for the account. Example: "6a0af1f0c9f63c0018aed306"')
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    raw_address: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    account_stage_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    organization: z
        .object({
            id: z.string().nullable().optional(),
            name: z.string().nullable().optional(),
            domain: z.string().nullable().optional()
        })
        .nullable()
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
    version: '1.0.1',
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
            ...(account.name != null && { name: account.name }),
            ...(account.domain != null && { domain: account.domain }),
            ...(account.phone != null && { phone: account.phone }),
            ...(account.raw_address != null && { raw_address: account.raw_address }),
            ...(account.owner_id != null && { owner_id: account.owner_id }),
            ...(account.account_stage_id != null && { account_stage_id: account.account_stage_id }),
            ...(account.created_at != null && { created_at: account.created_at }),
            ...(account.updated_at != null && { updated_at: account.updated_at }),
            ...(account.typed_custom_fields != null && { typed_custom_fields: account.typed_custom_fields }),
            ...(account.organization != null && {
                organization: {
                    ...(account.organization.id != null && { id: account.organization.id }),
                    ...(account.organization.name != null && { name: account.organization.name }),
                    ...(account.organization.domain != null && { domain: account.organization.domain })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
