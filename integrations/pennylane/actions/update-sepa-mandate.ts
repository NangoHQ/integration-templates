import { z } from 'zod';
import { createAction } from 'nango';

const SequenceTypeEnum = z.enum(['FRST', 'OOFF', 'RCUR', 'FNAL']);

const InputSchema = z.object({
    id: z.number().describe('ID of the SEPA mandate to update. Example: 12345'),
    bank: z.string().nullable().optional().describe("Name of the customer's bank. Pass null to clear. Example: 'BNP Paribas'"),
    bic: z.string().optional().describe("Bank Identifier Code (BIC) of the customer's bank. Example: 'BNPAFRPP'"),
    iban: z.string().optional().describe("International Bank Account Number (IBAN) of the customer. Example: 'FR3612739000506556687647Z31'"),
    sequence_type: SequenceTypeEnum.optional().describe("SEPA mandate sequence type. Example: 'RCUR'"),
    signed_at: z.string().optional().describe("Date when the mandate was signed. Example: '2025-04-24'"),
    identifier: z.string().optional().describe("Unique identifier for the mandate. Example: 'K-02-2025-12345'"),
    customer_id: z.number().optional().describe('ID of the customer for which the mandate is created. Example: 47334785')
});

const OutputSchema = z.object({
    id: z.number().describe('ID of the SEPA mandate. Example: 12345'),
    bank: z.string().optional().describe("Name of the customer's bank. Example: 'BNP Paribas'"),
    bic: z.string().describe("Bank Identifier Code (BIC) of the customer's bank. Example: 'BNPAFRPP'"),
    iban: z.string().describe("International Bank Account Number (IBAN) of the customer. Example: 'FR3612739000506556687647Z31'"),
    sequence_type: SequenceTypeEnum.describe("SEPA mandate sequence type. Example: 'RCUR'"),
    signed_at: z.string().describe("Date when the mandate was signed. Example: '2025-04-24'"),
    identifier: z.string().describe("Unique identifier for the mandate. Example: 'K-02-2023-12345'"),
    customer_id: z.number().describe('ID of the customer associated with the mandate. Example: 42'),
    created_at: z.string().describe("Creation date of the SEPA mandate. Example: '2023-08-07T14:23:12.000Z'"),
    updated_at: z.string().describe("Last update date of the SEPA mandate. Example: '2023-08-07T14:23:12.000Z'")
});

const ProviderResponseSchema = z.object({
    id: z.number(),
    bank: z.string().nullable(),
    bic: z.string(),
    iban: z.string(),
    sequence_type: SequenceTypeEnum,
    signed_at: z.string(),
    identifier: z.string(),
    customer: z.object({
        id: z.number(),
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Update a SEPA mandate.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putsepamandate
            endpoint: `/api/external/v2/sepa_mandates/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.bank !== undefined && { bank: input.bank }),
                ...(input.bic !== undefined && { bic: input.bic }),
                ...(input.iban !== undefined && { iban: input.iban }),
                ...(input.sequence_type !== undefined && { sequence_type: input.sequence_type }),
                ...(input.signed_at !== undefined && { signed_at: input.signed_at }),
                ...(input.identifier !== undefined && { identifier: input.identifier }),
                ...(input.customer_id !== undefined && { customer_id: input.customer_id })
            },
            retries: 3
        });

        const providerMandate = ProviderResponseSchema.parse(response.data);

        return {
            id: providerMandate.id,
            ...(providerMandate.bank != null && { bank: providerMandate.bank }),
            bic: providerMandate.bic,
            iban: providerMandate.iban,
            sequence_type: providerMandate.sequence_type,
            signed_at: providerMandate.signed_at,
            identifier: providerMandate.identifier,
            customer_id: providerMandate.customer.id,
            created_at: providerMandate.created_at,
            updated_at: providerMandate.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
