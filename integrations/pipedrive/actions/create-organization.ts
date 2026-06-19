import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the organization. Example: "Acme Corp"'),
    owner_id: z.number().optional().describe('The ID of the user who owns the organization. Example: 12345'),
    visible_to: z.number().optional().describe('The visibility of the organization. 1 = owner and followers, 2 = entire company, 3 = owner only.'),
    label_ids: z.array(z.number()).optional().describe('The IDs of labels assigned to the organization.'),
    address: z
        .object({
            value: z.string().optional().describe('The full address of the organization.'),
            country: z.string().optional().describe('Country of the organization.'),
            admin_area_level_1: z.string().optional().describe('Admin area level 1 (e.g. state) of the organization.'),
            admin_area_level_2: z.string().optional().describe('Admin area level 2 (e.g. county) of the organization.'),
            locality: z.string().optional().describe('Locality (e.g. city) of the organization.'),
            sublocality: z.string().optional().describe('Sublocality (e.g. neighborhood) of the organization.'),
            route: z.string().optional().describe('Route (e.g. street) of the organization.'),
            street_number: z.string().optional().describe('Street number of the organization.'),
            subpremise: z.string().optional().describe('Subpremise (e.g. apartment/suite number) of the organization.'),
            postal_code: z.string().optional().describe('Postal code of the organization.')
        })
        .optional()
        .describe('The address of the organization.'),
    custom_fields: z.record(z.string(), z.unknown()).optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.number(),
    name: z.string(),
    owner_id: z
        .union([z.number(), z.object({ id: z.number() }).transform((obj) => obj.id)])
        .nullable()
        .optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    visible_to: z
        .union([z.number(), z.string(), z.object({ id: z.number() }).transform((obj) => obj.id)])
        .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
        .nullable()
        .optional(),
    label_ids: z.array(z.number()).optional(),
    address: z
        .object({
            value: z.string().nullable().optional(),
            country: z.string().nullable().optional(),
            admin_area_level_1: z.string().nullable().optional(),
            admin_area_level_2: z.string().nullable().optional(),
            locality: z.string().nullable().optional(),
            sublocality: z.string().nullable().optional(),
            route: z.string().nullable().optional(),
            street_number: z.string().nullable().optional(),
            subpremise: z.string().nullable().optional(),
            postal_code: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    owner_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    visible_to: z.number().optional(),
    label_ids: z.array(z.number()).optional(),
    address: z
        .object({
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
        })
        .optional()
});

const action = createAction({
    description: 'Create a organization in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:write', 'contacts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pipedrive.com/docs/api/v1/Organizations
            endpoint: '/v1/organizations',
            data: {
                name: input.name,
                ...(input.owner_id !== undefined && { owner_id: input.owner_id }),
                ...(input.visible_to !== undefined && { visible_to: input.visible_to }),
                ...(input.label_ids !== undefined && { label_ids: input.label_ids }),
                ...(input.address !== undefined && { address: input.address }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
            },
            retries: 10
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create organization. Invalid response from Pipedrive API.'
            });
        }

        const providerOrg = ProviderOrganizationSchema.parse(response.data.data);

        return {
            id: providerOrg.id,
            name: providerOrg.name,
            ...(providerOrg.owner_id != null && { owner_id: providerOrg.owner_id }),
            ...(providerOrg.add_time !== undefined && { add_time: providerOrg.add_time }),
            ...(providerOrg.update_time !== undefined && { update_time: providerOrg.update_time }),
            ...(providerOrg.visible_to != null && { visible_to: providerOrg.visible_to }),
            ...(providerOrg.label_ids !== undefined && { label_ids: providerOrg.label_ids }),
            ...(providerOrg.address != null && {
                address: {
                    ...(providerOrg.address.value != null && { value: providerOrg.address.value }),
                    ...(providerOrg.address.country != null && { country: providerOrg.address.country }),
                    ...(providerOrg.address.admin_area_level_1 != null && { admin_area_level_1: providerOrg.address.admin_area_level_1 }),
                    ...(providerOrg.address.admin_area_level_2 != null && { admin_area_level_2: providerOrg.address.admin_area_level_2 }),
                    ...(providerOrg.address.locality != null && { locality: providerOrg.address.locality }),
                    ...(providerOrg.address.sublocality != null && { sublocality: providerOrg.address.sublocality }),
                    ...(providerOrg.address.route != null && { route: providerOrg.address.route }),
                    ...(providerOrg.address.street_number != null && { street_number: providerOrg.address.street_number }),
                    ...(providerOrg.address.subpremise != null && { subpremise: providerOrg.address.subpremise }),
                    ...(providerOrg.address.postal_code != null && { postal_code: providerOrg.address.postal_code })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
