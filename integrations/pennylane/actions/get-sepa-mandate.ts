import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('ID of the SEPA mandate to retrieve. Example: 8323891200')
});

const ProviderCustomerRefSchema = z.object({
    id: z.number().int(),
    url: z.string()
});

const ProviderSepaMandateSchema = z.object({
    id: z.number().int(),
    bank: z.string().nullable(),
    bic: z.string(),
    iban: z.string(),
    sequence_type: z.enum(['FRST', 'OOFF', 'RCUR', 'FNAL']),
    signed_at: z.string(),
    identifier: z.string(),
    customer: ProviderCustomerRefSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().int(),
    bank: z.string().optional(),
    bic: z.string(),
    iban: z.string(),
    sequence_type: z.enum(['FRST', 'OOFF', 'RCUR', 'FNAL']),
    signed_at: z.string(),
    identifier: z.string(),
    customer: z.object({
        id: z.number().int(),
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve a SEPA mandate',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsepamandate
            endpoint: `/api/external/v2/sepa_mandates/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'SEPA mandate not found',
                id: input.id
            });
        }

        const providerMandate = ProviderSepaMandateSchema.parse(response.data);

        return {
            id: providerMandate.id,
            bic: providerMandate.bic,
            iban: providerMandate.iban,
            sequence_type: providerMandate.sequence_type,
            signed_at: providerMandate.signed_at,
            identifier: providerMandate.identifier,
            customer: providerMandate.customer,
            created_at: providerMandate.created_at,
            updated_at: providerMandate.updated_at,
            ...(providerMandate.bank != null && { bank: providerMandate.bank })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
