import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    buildingId: z.string().describe('Building ID. Example: "6a71dfc6f55241acad0cd599"')
});

const ProviderAddressSchema = z.object({
    country_code: z.string().nullable().optional(),
    admin_area_1: z.string().nullable().optional(),
    admin_area_1_code: z.string().nullable().optional(),
    admin_area_2: z.string().nullable().optional(),
    locality: z.string().nullable().optional(),
    address_line_1: z.string().nullable().optional(),
    address_line_2: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional()
});

const ProviderBuildingSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    generated_id: z.union([z.string(), z.number()]).nullable().optional(),
    custom_id: z.string().nullable().optional(),
    is_confidential: z.boolean().nullable().optional(),
    address: ProviderAddressSchema.nullable().optional()
});

const OutputAddressSchema = z.object({
    country_code: z.string().optional(),
    admin_area_1: z.string().optional(),
    admin_area_1_code: z.string().optional(),
    admin_area_2: z.string().optional(),
    locality: z.string().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    postal_code: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    generated_id: z.string().optional(),
    custom_id: z.string().optional(),
    is_confidential: z.boolean().optional(),
    address: OutputAddressSchema.optional()
});

const action = createAction({
    description: 'Get a single building by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.ingenious.build/reference/getbuildingpubv2
            endpoint: `/api/v2/pub/buildings/${encodeURIComponent(input.buildingId)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Building not found',
                building_id: input.buildingId
            });
        }

        const building = ProviderBuildingSchema.parse(response.data);

        return {
            id: building.id,
            ...(building.name !== undefined && building.name !== null && { name: building.name }),
            ...(building.generated_id !== undefined && building.generated_id !== null && { generated_id: String(building.generated_id) }),
            ...(building.custom_id !== undefined && building.custom_id !== null && { custom_id: building.custom_id }),
            ...(building.is_confidential !== undefined && building.is_confidential !== null && { is_confidential: building.is_confidential }),
            ...(building.address !== undefined &&
                building.address !== null && {
                    address: {
                        ...(building.address.country_code !== undefined &&
                            building.address.country_code !== null && { country_code: building.address.country_code }),
                        ...(building.address.admin_area_1 !== undefined &&
                            building.address.admin_area_1 !== null && { admin_area_1: building.address.admin_area_1 }),
                        ...(building.address.admin_area_1_code !== undefined &&
                            building.address.admin_area_1_code !== null && { admin_area_1_code: building.address.admin_area_1_code }),
                        ...(building.address.admin_area_2 !== undefined &&
                            building.address.admin_area_2 !== null && { admin_area_2: building.address.admin_area_2 }),
                        ...(building.address.locality !== undefined && building.address.locality !== null && { locality: building.address.locality }),
                        ...(building.address.address_line_1 !== undefined &&
                            building.address.address_line_1 !== null && { address_line_1: building.address.address_line_1 }),
                        ...(building.address.address_line_2 !== undefined &&
                            building.address.address_line_2 !== null && { address_line_2: building.address.address_line_2 }),
                        ...(building.address.postal_code !== undefined &&
                            building.address.postal_code !== null && { postal_code: building.address.postal_code })
                    }
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
