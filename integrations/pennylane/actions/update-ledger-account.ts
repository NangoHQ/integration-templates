import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Ledger Account ID. Example: 14048452796416'),
    label: z.string().optional().describe('Label that describes the ledger account'),
    letterable: z.boolean().optional().describe('Whether the ledger entries of this ledger account are letterable')
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number(),
    number: z.string(),
    label: z.string(),
    vat_rate: z.string(),
    country_alpha2: z.string(),
    enabled: z.boolean(),
    type: z.string(),
    letterable: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    number: z.string(),
    label: z.string(),
    vat_rate: z.string(),
    country_alpha2: z.string(),
    enabled: z.boolean(),
    type: z.string(),
    letterable: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Update a ledger account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_accounts:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};
        if (input.label !== undefined) {
            requestBody['label'] = input.label;
        }
        if (input.letterable !== undefined) {
            requestBody['letterable'] = input.letterable;
        }

        // https://pennylane.readme.io/reference/updateledgeraccount
        const response = await nango.put({
            endpoint: `/api/external/v2/ledger_accounts/${encodeURIComponent(input.id)}`,
            data: requestBody,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Pennylane API'
            });
        }

        const providerAccount = ProviderLedgerAccountSchema.parse(response.data);

        return {
            id: providerAccount.id,
            number: providerAccount.number,
            label: providerAccount.label,
            vat_rate: providerAccount.vat_rate,
            country_alpha2: providerAccount.country_alpha2,
            enabled: providerAccount.enabled,
            type: providerAccount.type,
            letterable: providerAccount.letterable,
            created_at: providerAccount.created_at,
            updated_at: providerAccount.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
