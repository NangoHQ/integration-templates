import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter_id: z.number().optional().describe('If supplied, only deals matching the specified filter are returned.'),
    owner_id: z.number().optional().describe('If supplied, only deals owned by the specified user are returned.'),
    person_id: z.number().optional().describe('If supplied, only deals linked to the specified person are returned.'),
    org_id: z.number().optional().describe('If supplied, only deals linked to the specified organization are returned.'),
    pipeline_id: z.number().optional().describe('If supplied, only deals in the specified pipeline are returned.'),
    stage_id: z.number().optional().describe('If supplied, only deals in the specified stage are returned.'),
    status: z.string().optional().describe('Only fetch deals with a specific status. If omitted, all not deleted deals are returned.'),
    limit: z.number().optional().describe('The number of items to return per page. Maximum 500.')
});

const DealSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    status: z.string().optional(),
    stage_id: z.number().optional(),
    pipeline_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(DealSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List deals from Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-deals',
        group: 'Deals'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['deals:full'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        let start: number | undefined;
        if (input.cursor !== undefined) {
            const parsed = parseInt(input.cursor, 10);
            if (Number.isNaN(parsed) || parsed < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string'
                });
            }
            start = parsed;
        }

        const params: Record<string, string | number> = {};
        if (start !== undefined) {
            params['start'] = start;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.filter_id !== undefined) {
            params['filter_id'] = input.filter_id;
        }
        if (input.owner_id !== undefined) {
            params['owner_id'] = input.owner_id;
        }
        if (input.person_id !== undefined) {
            params['person_id'] = input.person_id;
        }
        if (input.org_id !== undefined) {
            params['org_id'] = input.org_id;
        }
        if (input.pipeline_id !== undefined) {
            params['pipeline_id'] = input.pipeline_id;
        }
        if (input.stage_id !== undefined) {
            params['stage_id'] = input.stage_id;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }

        const config: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Deals#getAllDeals
            endpoint: '/v1/deals',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const ResponseSchema = z.object({
            success: z.boolean(),
            data: z.array(z.unknown()).optional(),
            additional_data: z
                .object({
                    pagination: z
                        .object({
                            start: z.number(),
                            limit: z.number(),
                            more_items_in_collection: z.boolean(),
                            next_start: z.number().optional()
                        })
                        .optional()
                })
                .optional()
        });

        const parsed = ResponseSchema.parse(response.data);

        if (!parsed.success || !parsed.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Pipedrive API returned an unsuccessful response'
            });
        }

        const items = parsed.data.map((item) => {
            const result = DealSchema.safeParse(item);
            if (!result.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse deal from provider response'
                });
            }
            return result.data;
        });

        const nextCursor =
            parsed.additional_data?.pagination?.more_items_in_collection === true && parsed.additional_data.pagination.next_start !== undefined
                ? String(parsed.additional_data.pagination.next_start)
                : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
