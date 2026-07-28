import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const ProviderActivitySchema = z
    .object({
        id: z.number(),
        version: z.number().optional(),
        url: z.string().optional(),
        name: z.string().optional(),
        number: z.string().optional(),
        description: z.string().optional(),
        activityType: z.string().optional(),
        isProjectActivity: z.boolean().optional(),
        isGeneral: z.boolean().optional(),
        isChargeable: z.boolean().optional(),
        isBillable: z.boolean().optional(),
        isTimesheetActivity: z.boolean().optional(),
        isTravelExpense: z.boolean().optional(),
        deletable: z.boolean().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z
    .object({
        fullResultSize: z.number().optional(),
        from: z.number().optional(),
        count: z.number().optional(),
        values: z.array(z.unknown()).optional()
    })
    .passthrough();

const ActivitySchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
    description: z.string().optional(),
    activityType: z.string().optional(),
    isProjectActivity: z.boolean().optional(),
    isGeneral: z.boolean().optional(),
    isChargeable: z.boolean().optional(),
    isBillable: z.boolean().optional(),
    isTimesheetActivity: z.boolean().optional(),
    isTravelExpense: z.boolean().optional(),
    deletable: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(ActivitySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List activities (used for timesheet/project time entries).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = 100;
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }
        const offset = input.cursor ? Number(input.cursor) : 0;

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/activity',
            params: {
                from: String(offset),
                count: String(pageSize)
            },
            retries: 3
        });

        const raw = ProviderListResponseSchema.parse(response.data);
        const values = raw.values ?? [];
        const nextOffset = offset + values.length;
        const hasMore = raw.fullResultSize != null ? nextOffset < raw.fullResultSize : values.length === pageSize;

        const items = values.map((item: unknown) => {
            const activity = ProviderActivitySchema.parse(item);
            return {
                id: activity.id,
                ...(activity.version !== undefined && { version: activity.version }),
                ...(activity.url !== undefined && { url: activity.url }),
                ...(activity.name !== undefined && { name: activity.name }),
                ...(activity.number !== undefined && { number: activity.number }),
                ...(activity.description !== undefined && { description: activity.description }),
                ...(activity.activityType !== undefined && { activityType: activity.activityType }),
                ...(activity.isProjectActivity !== undefined && { isProjectActivity: activity.isProjectActivity }),
                ...(activity.isGeneral !== undefined && { isGeneral: activity.isGeneral }),
                ...(activity.isChargeable !== undefined && { isChargeable: activity.isChargeable }),
                ...(activity.isBillable !== undefined && { isBillable: activity.isBillable }),
                ...(activity.isTimesheetActivity !== undefined && { isTimesheetActivity: activity.isTimesheetActivity }),
                ...(activity.isTravelExpense !== undefined && { isTravelExpense: activity.isTravelExpense }),
                ...(activity.deletable !== undefined && { deletable: activity.deletable })
            };
        });

        return {
            items,
            ...(hasMore && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
