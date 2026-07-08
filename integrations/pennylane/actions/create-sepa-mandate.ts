import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bic: z.string().describe('BIC of the bank. Example: "SOGEFRPP"'),
    iban: z.string().describe('IBAN of the customer account. Must pass checksum validation. Example: "FR1420041010050500013M02606"'),
    signed_at: z.string().describe('Date the mandate was signed. Example: "2026-01-01"'),
    identifier: z.string().describe('Unique identifier for the mandate. Example: "MANDATE-001"'),
    customer_id: z.number().describe('Customer ID. Example: 1338468995072')
});

const ProviderSepaMandateSchema = z
    .object({
        id: z.number(),
        bank: z.string().nullable().optional(),
        bic: z.string(),
        iban: z.string(),
        sequence_type: z.string().optional(),
        signed_at: z.string(),
        identifier: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        customer: z.object({
            id: z.number(),
            url: z.string()
        })
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().describe('Mandate ID. Example: "8323891200"'),
    customer_id: z.string().describe('Customer ID. Example: "1338468995072"'),
    bank: z.string().optional(),
    bic: z.string(),
    iban: z.string(),
    sequence_type: z.string().optional(),
    signed_at: z.string(),
    identifier: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a SEPA mandate.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/post_sepa_mandates
            endpoint: '/api/external/v2/sepa_mandates',
            data: {
                bic: input.bic,
                iban: input.iban,
                signed_at: input.signed_at,
                identifier: input.identifier,
                customer_id: input.customer_id
            },
            retries: 3
        });

        const providerMandate = ProviderSepaMandateSchema.parse(response.data);

        return {
            id: String(providerMandate.id),
            customer_id: String(providerMandate.customer.id),
            ...(providerMandate.bank != null && { bank: providerMandate.bank }),
            bic: providerMandate.bic,
            iban: providerMandate.iban,
            ...(providerMandate.sequence_type !== undefined && { sequence_type: providerMandate.sequence_type }),
            signed_at: providerMandate.signed_at,
            identifier: providerMandate.identifier,
            ...(providerMandate.created_at !== undefined && { created_at: providerMandate.created_at }),
            ...(providerMandate.updated_at !== undefined && { updated_at: providerMandate.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
