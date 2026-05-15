import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the organization to update. Example: 123'),
    name: z.string().optional().describe('The name of the organization'),
    owner_id: z.number().optional().describe('The ID of the user who owns the organization'),
    visible_to: z.number().optional().describe('The visibility of the organization'),
    label_ids: z.array(z.number()).optional().describe('The IDs of labels assigned to the organization'),
    address: z
        .object({
            value: z.string().optional().describe('The full address of the organization'),
            country: z.string().optional().describe('Country of the organization'),
            admin_area_level_1: z.string().optional().describe('Admin area level 1 (e.g. state)'),
            admin_area_level_2: z.string().optional().describe('Admin area level 2 (e.g. county)'),
            locality: z.string().optional().describe('Locality (e.g. city)'),
            sublocality: z.string().optional().describe('Sublocality (e.g. neighborhood)'),
            route: z.string().optional().describe('Route (e.g. street)'),
            street_number: z.string().optional().describe('Street number'),
            subpremise: z.string().optional().describe('Subpremise (e.g. apartment/suite number)'),
            postal_code: z.string().optional().describe('Postal code')
        })
        .optional()
        .describe('The address of the organization'),
    custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom fields as an object with 40-character hash keys')
});

const ProviderOrganizationSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    owner_id: z.unknown().optional(),
    visible_to: z.unknown().optional(),
    label_ids: z.array(z.number()).optional(),
    address: z.unknown().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const AddressOutputSchema = z.object({
    value: z.string().optional(),
    country: z.string().optional(),
    admin_area_level_1: z.string().optional(),
    admin_area_level_2: z.string().optional(),
    locality: z.string().optional(),
    sublocality: z.string().optional(),
    route: z.string().optional(),
    street_number: z.string().optional(),
    subpremise: z.string().optional(),
    postal_code: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    owner_id: z.number().optional(),
    visible_to: z.number().optional(),
    label_ids: z.array(z.number()).optional(),
    address: AddressOutputSchema.optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

// Helper function to safely extract number from unknown
function extractNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return value;
    }
    return undefined;
}

// Helper function to safely extract address from unknown
function extractAddress(value: unknown): z.infer<typeof AddressOutputSchema> | undefined {
    const AddressInputSchema = z.object({
        value: z.string().optional(),
        country: z.string().optional(),
        admin_area_level_1: z.string().optional(),
        admin_area_level_2: z.string().optional(),
        locality: z.string().optional(),
        sublocality: z.string().optional(),
        route: z.string().optional(),
        street_number: z.string().optional(),
        subpremise: z.string().optional(),
        postal_code: z.string().optional()
    });

    const parsed = AddressInputSchema.safeParse(value);
    if (!parsed.success) {
        return undefined;
    }

    const addr = parsed.data;
    const result: z.infer<typeof AddressOutputSchema> = {};

    if (addr.value) result['value'] = addr.value;
    if (addr.country) result['country'] = addr.country;
    if (addr.admin_area_level_1) result['admin_area_level_1'] = addr.admin_area_level_1;
    if (addr.admin_area_level_2) result['admin_area_level_2'] = addr.admin_area_level_2;
    if (addr.locality) result['locality'] = addr.locality;
    if (addr.sublocality) result['sublocality'] = addr.sublocality;
    if (addr.route) result['route'] = addr.route;
    if (addr.street_number) result['street_number'] = addr.street_number;
    if (addr.subpremise) result['subpremise'] = addr.subpremise;
    if (addr.postal_code) result['postal_code'] = addr.postal_code;

    return Object.keys(result).length > 0 ? result : undefined;
}

const action = createAction({
    description: 'Update a organization in Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Organizations#updateOrganization
        const response = await nango.put({
            endpoint: `/v1/organizations/${input.id}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.owner_id !== undefined && { owner_id: input.owner_id }),
                ...(input.visible_to !== undefined && { visible_to: input.visible_to }),
                ...(input.label_ids !== undefined && { label_ids: input.label_ids }),
                ...(input.address !== undefined && { address: input.address }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
            },
            retries: 3
        });

        // Pipedrive API returns { success: true, data: { ... } }
        const ResponseSchema = z.object({
            success: z.boolean().optional(),
            data: z.unknown().optional()
        });
        const responseData = ResponseSchema.parse(response.data);

        if (!responseData.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found or update failed',
                organization_id: input.id
            });
        }

        const providerOrg = ProviderOrganizationSchema.parse(responseData.data);

        return {
            id: providerOrg.id,
            ...(providerOrg.name !== undefined && { name: providerOrg.name }),
            ...(extractNumber(providerOrg.owner_id) !== undefined && {
                owner_id: extractNumber(providerOrg.owner_id)
            }),
            ...(extractNumber(providerOrg.visible_to) !== undefined && {
                visible_to: extractNumber(providerOrg.visible_to)
            }),
            ...(providerOrg.label_ids !== undefined && { label_ids: providerOrg.label_ids }),
            ...(extractAddress(providerOrg.address) !== undefined && {
                address: extractAddress(providerOrg.address)
            }),
            ...(providerOrg.add_time !== undefined && { add_time: providerOrg.add_time }),
            ...(providerOrg.update_time !== undefined && { update_time: providerOrg.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
