import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of items to return per page. Maximum 100.')
});

const AddressSchema = z.object({
    country_code: z.string().nullable().optional(),
    admin_area_1: z.string().nullable().optional(),
    admin_area_1_code: z.string().nullable().optional(),
    locality: z.string().nullable().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional()
});

const BuildingSchema = z.object({
    id: z.string(),
    generated_id: z.number().int(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    classification: z.string().nullable().optional(),
    address: AddressSchema.nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    archived_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(BuildingSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(z.unknown()),
    total: z.number().int().optional(),
    page: z.number().int().optional(),
    per_page: z.number().int().optional(),
    next_page_url: z.string().nullable().optional()
});

const action = createAction({
    description: 'List buildings/addresses registered in this workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page: number | undefined;
        if (input.cursor !== undefined) {
            const parsed = parseInt(input.cursor, 10);
            if (isNaN(parsed) || parsed < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a positive integer representing a page number.'
                });
            }
            page = parsed;
        }

        const response = await nango.get({
            // https://api.ingenious.build/reference/v2-get-buildings.md
            endpoint: '/api/v2/pub/buildings',
            params: {
                ...(page !== undefined && { page }),
                per_page: input.per_page ?? 20
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.items.map((item) => {
            const building = BuildingSchema.parse(item);
            return {
                id: building.id,
                generated_id: building.generated_id,
                ...(building.name != null && { name: building.name }),
                ...(building.description != null && { description: building.description }),
                ...(building.status != null && { status: building.status }),
                ...(building.classification != null && { classification: building.classification }),
                ...(building.address != null && {
                    address: {
                        ...(building.address.country_code != null && { country_code: building.address.country_code }),
                        ...(building.address.admin_area_1 != null && { admin_area_1: building.address.admin_area_1 }),
                        ...(building.address.admin_area_1_code != null && { admin_area_1_code: building.address.admin_area_1_code }),
                        ...(building.address.locality != null && { locality: building.address.locality }),
                        ...(building.address.address_line_1 != null && { address_line_1: building.address.address_line_1 }),
                        ...(building.address.address_line_2 != null && { address_line_2: building.address.address_line_2 }),
                        ...(building.address.postal_code != null && { postal_code: building.address.postal_code })
                    }
                }),
                ...(building.created_at != null && { created_at: building.created_at }),
                ...(building.updated_at != null && { updated_at: building.updated_at }),
                ...(building.archived_at != null && { archived_at: building.archived_at })
            };
        });

        const currentPage = providerResponse.page ?? page ?? 1;
        return {
            items,
            ...(providerResponse.next_page_url != null && { next_cursor: String(currentPage + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
