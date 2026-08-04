import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    country_code: z.string().length(2).describe('ISO 3166-1 alpha-2 country code. Example: "US"'),
    locality: z.string().max(255).describe('City or town. Example: "White Plains"'),
    address_line_1: z.string().max(255).describe('Street address. Example: "123 Main Street"'),
    admin_area_1: z.string().max(255).optional().describe('State or province. Required for US and Canada. Example: "New York"'),
    postal_code: z.string().max(255).optional().describe('Postal code. Example: "10601"'),
    name: z.string().max(60).optional().describe('Building name. Example: "Main Office"'),
    description: z.string().max(255).optional().describe('Building description. Example: "Headquarters building"'),
    custom_id: z.string().max(40).optional().describe('Custom identifier. Example: "BLDG-001"'),
    status: z.string().optional().describe('Building status. Example: "occupied"'),
    classification: z.string().optional().describe('Building classification. Example: "office"'),
    owner_contact_id: z.string().optional().describe('ID of the owner contact. Example: "6a71ddac92e09607f906db64"'),
    owner_company_id: z.string().optional().describe('ID of the owner company. Example: "6a71ddac92e09607f906db63"')
});

const ProviderResponseSchema = z.object({
    id: z.string().describe('ID of the created building. Example: "6a71dfc6f55241acad0cd599"')
});

const OutputSchema = z.object({
    id: z.string().describe('ID of the created building. Example: "6a71dfc6f55241acad0cd599"')
});

const action = createAction({
    description: 'Register a new building/address in the workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input.country_code === 'US' || input.country_code === 'CA') && input.admin_area_1 === undefined) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'admin_area_1 (State/Province) is required for country United States and Canada.'
            });
        }

        const response = await nango.post({
            // https://api.ingenious.build/reference/v2-create-building.md
            endpoint: '/api/v2/pub/buildings',
            data: {
                country_code: input.country_code,
                locality: input.locality,
                address_line_1: input.address_line_1,
                ...(input.admin_area_1 !== undefined && { admin_area_1: input.admin_area_1 }),
                ...(input.postal_code !== undefined && { postal_code: input.postal_code }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.custom_id !== undefined && { custom_id: input.custom_id }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.classification !== undefined && { classification: input.classification }),
                ...(input.owner_contact_id !== undefined && { owner_contact_id: input.owner_contact_id }),
                ...(input.owner_company_id !== undefined && { owner_company_id: input.owner_company_id })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
