import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    number: z.string().describe('Ledger Account number. Example: "606001"'),
    label: z.string().describe('Ledger Account label. Example: "Office Supplies"'),
    vat_rate: z.string().optional().describe('VAT rate code. Example: "FR_200"'),
    country_alpha2: z.string().optional().describe('Country alpha-2 code. Example: "FR"')
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number(),
    number: z.string(),
    label: z.string(),
    enabled: z.boolean().optional(),
    vat_rate: z.string().optional().nullable(),
    country_alpha2: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    number: z.string(),
    label: z.string(),
    enabled: z.boolean().optional(),
    vat_rate: z.string().optional(),
    country_alpha2: z.string().optional()
});

const action = createAction({
    description: 'Create a ledger account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_accounts:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/postledgeraccounts
        const response = await nango.post({
            endpoint: '/api/external/v2/ledger_accounts',
            data: {
                number: input.number,
                label: input.label,
                ...(input.vat_rate !== undefined && { vat_rate: input.vat_rate }),
                ...(input.country_alpha2 !== undefined && { country_alpha2: input.country_alpha2 })
            },
            retries: 3
        });

        const providerAccount = ProviderLedgerAccountSchema.parse(response.data);

        return {
            id: providerAccount.id,
            number: providerAccount.number,
            label: providerAccount.label,
            ...(providerAccount.enabled !== undefined && { enabled: providerAccount.enabled }),
            ...(providerAccount.vat_rate != null && { vat_rate: providerAccount.vat_rate }),
            ...(providerAccount.country_alpha2 != null && { country_alpha2: providerAccount.country_alpha2 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
