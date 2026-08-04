import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    current_only: z.boolean().optional().describe('Only return active downtimes. Default: false.'),
    page_limit: z.number().optional().describe('Number of downtimes to return per page. Maximum 100.'),
    page_offset: z.number().optional().describe('Offset for pagination.')
});

const DowntimeRecurrenceSchema = z
    .object({
        type: z.string().optional(),
        period: z.number().optional(),
        week_days: z.array(z.string()).optional(),
        until_date: z.number().optional().nullable(),
        until_occurrences: z.number().optional().nullable()
    })
    .passthrough();

const DowntimeAttributesSchema = z
    .object({
        message: z.string().optional().nullable(),
        monitor_id: z.number().optional().nullable(),
        monitor_tags: z.array(z.string()).optional(),
        scope: z.union([z.string(), z.array(z.string())]).optional(),
        disabled: z.boolean().optional(),
        start: z.number().optional().nullable(),
        end: z.number().optional().nullable(),
        timezone: z.string().optional(),
        active: z.boolean().optional(),
        recurrence: DowntimeRecurrenceSchema.optional().nullable(),
        status: z.string().optional(),
        created: z.string().optional(),
        modified: z.string().optional(),
        mute_first_recovery_notification: z.boolean().optional(),
        notify_end_states: z.array(z.string()).optional(),
        notify_end_types: z.array(z.string()).optional(),
        creator_id: z.number().optional().nullable(),
        updater_id: z.number().optional().nullable()
    })
    .passthrough();

const DowntimeSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: DowntimeAttributesSchema
});

const MetaSchema = z
    .object({
        page: z
            .object({
                total_count: z.number().optional(),
                total_filtered_count: z.number().optional()
            })
            .optional()
    })
    .optional();

const OutputSchema = z.object({
    data: z.array(DowntimeSchema),
    meta: MetaSchema
});

const action = createAction({
    description: 'List scheduled and active downtimes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/downtimes/
        const response = await nango.get({
            endpoint: 'v2/downtime',
            params: {
                ...(input.current_only !== undefined && {
                    current_only: String(input.current_only)
                }),
                ...(input.page_limit !== undefined && {
                    'page[limit]': String(input.page_limit)
                }),
                ...(input.page_offset !== undefined && {
                    'page[offset]': String(input.page_offset)
                })
            },
            retries: 3
        });

        const rawData = response.data;

        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Datadog API'
            });
        }

        const parsed = OutputSchema.parse(rawData);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
