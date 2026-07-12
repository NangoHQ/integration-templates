import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Ledger Account ID. Example: "14048452796416"')
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

const OutputSchema = ProviderLedgerAccountSchema;

const action = createAction({
    description: 'Retrieve a ledger account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_accounts:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getledgeraccount
            endpoint: `/api/external/v2/ledger_accounts/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ledger account not found',
                id: input.id
            });
        }

        const ledgerAccount = ProviderLedgerAccountSchema.parse(response.data);

        return ledgerAccount;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
