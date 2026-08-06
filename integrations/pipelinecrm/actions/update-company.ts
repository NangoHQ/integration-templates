import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company_id: z.string().describe('Company ID. Example: "138551860"'),
    name: z.string().nullable().optional().describe('Company name'),
    city: z.string().nullable().optional().describe('City'),
    state: z.string().nullable().optional().describe('State'),
    postal_code: z.string().nullable().optional().describe('ZIP or postal code'),
    country: z.string().nullable().optional().describe('Country'),
    address_1: z.string().nullable().optional().describe('Primary street address'),
    phone1: z.string().nullable().optional().describe('Primary phone number'),
    web: z.string().nullable().optional().describe('Website URL'),
    description: z.string().nullable().optional().describe('Company description')
});

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    address_1: z.string().nullable().optional(),
    phone1: z.string().nullable().optional(),
    web: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    address_1: z.string().optional(),
    phone1: z.string().optional(),
    web: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Update fields on an existing company',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) body['name'] = input.name;
        if (input.city !== undefined) body['city'] = input.city;
        if (input.state !== undefined) body['state'] = input.state;
        if (input.postal_code !== undefined) body['postal_code'] = input.postal_code;
        if (input.country !== undefined) body['country'] = input.country;
        if (input.address_1 !== undefined) body['address_1'] = input.address_1;
        if (input.phone1 !== undefined) body['phone1'] = input.phone1;
        if (input.web !== undefined) body['web'] = input.web;
        if (input.description !== undefined) body['description'] = input.description;

        const response = await nango.put({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/companies/${encodeURIComponent(input.company_id)}`,
            data: {
                company: body
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company not found or update failed',
                company_id: input.company_id
            });
        }

        const providerCompany = ProviderCompanySchema.parse(response.data);

        return {
            id: String(providerCompany.id),
            ...(providerCompany.name != null && { name: providerCompany.name }),
            ...(providerCompany.city != null && { city: providerCompany.city }),
            ...(providerCompany.state != null && { state: providerCompany.state }),
            ...(providerCompany.postal_code != null && { postal_code: providerCompany.postal_code }),
            ...(providerCompany.country != null && { country: providerCompany.country }),
            ...(providerCompany.address_1 != null && { address_1: providerCompany.address_1 }),
            ...(providerCompany.phone1 != null && { phone1: providerCompany.phone1 }),
            ...(providerCompany.web != null && { web: providerCompany.web }),
            ...(providerCompany.description != null && { description: providerCompany.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
