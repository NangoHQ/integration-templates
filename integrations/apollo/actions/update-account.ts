import * as z from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    owner_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    raw_address: z.string().optional(),
    phone: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional()
});

const ProviderAccountSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        domain: z.string().nullable().optional(),
        owner_id: z.string().nullable().optional(),
        account_stage_id: z.string().nullable().optional(),
        raw_address: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        typed_custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    account: ProviderAccountSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    owner_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    raw_address: z.string().optional(),
    phone: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional()
});

interface UpdateData {
    name?: string;
    domain?: string;
    owner_id?: string;
    account_stage_id?: string;
    raw_address?: string;
    phone?: string;
    typed_custom_fields?: Record<string, unknown>;
}

const action = createAction({
    description: 'Update an account in Apollo',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: UpdateData = {};

        if (input.name !== undefined) {
            updateData.name = input.name;
        }
        if (input.domain !== undefined) {
            updateData.domain = input.domain;
        }
        if (input.owner_id !== undefined) {
            updateData.owner_id = input.owner_id;
        }
        if (input.account_stage_id !== undefined) {
            updateData.account_stage_id = input.account_stage_id;
        }
        if (input.raw_address !== undefined) {
            updateData.raw_address = input.raw_address;
        }
        if (input.phone !== undefined) {
            updateData.phone = input.phone;
        }
        if (input.typed_custom_fields !== undefined) {
            updateData.typed_custom_fields = input.typed_custom_fields;
        }

        // https://docs.apollo.io/reference/update-an-account
        const response = await nango.patch({
            endpoint: `/v1/accounts/${encodeURIComponent(input.id)}`,
            data: updateData,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Apollo API',
                details: parsed.error.message
            });
        }

        const account = parsed.data.account;

        return {
            id: account.id,
            ...(account.name != null && { name: account.name }),
            ...(account.domain != null && { domain: account.domain }),
            ...(account.owner_id != null && { owner_id: account.owner_id }),
            ...(account.account_stage_id != null && { account_stage_id: account.account_stage_id }),
            ...(account.raw_address != null && { raw_address: account.raw_address }),
            ...(account.phone != null && { phone: account.phone }),
            ...(account.typed_custom_fields != null && { typed_custom_fields: account.typed_custom_fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
