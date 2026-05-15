import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pipeline_id: z.number().optional().describe('The ID of the pipeline to fetch stages for. If omitted, stages for all pipelines will be returned.'),
    sort_by: z.enum(['id', 'update_time', 'add_time', 'order_nr']).optional().describe('The field to sort by.'),
    sort_direction: z.enum(['asc', 'desc']).optional().describe('The sorting direction.'),
    limit: z.number().max(500).optional().describe('For pagination, the limit of entries to be returned. Maximum value of 500 is allowed.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const StageSchema = z.object({
    id: z.number(),
    name: z.string(),
    pipeline_id: z.number(),
    order_nr: z.number(),
    deal_probability: z.number().nullish(),
    is_deal_rot_enabled: z.boolean().nullish(),
    days_to_rotten: z.number().nullish(),
    add_time: z.string().nullish(),
    update_time: z.string().nullish(),
    active_flag: z.boolean().nullish()
});

const AdditionalDataSchema = z.object({
    next_cursor: z.string().optional(),
    limit: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(StageSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List stages from Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-stages',
        group: 'Stages'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.pipeline_id !== undefined) {
            params['pipeline_id'] = input.pipeline_id;
        }
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_direction !== undefined) {
            params['sort_direction'] = input.sort_direction;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Stages#getStages
            endpoint: '/v1/stages',
            params,
            retries: 3
        });

        const responseData = z
            .object({
                success: z.boolean(),
                data: z.array(StageSchema),
                additional_data: AdditionalDataSchema.optional()
            })
            .parse(response.data);

        return {
            items: responseData.data,
            ...(responseData.additional_data?.next_cursor != null && { next_cursor: responseData.additional_data.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
