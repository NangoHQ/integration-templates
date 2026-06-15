import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Blocked time ID. Example: 9990960594')
});

const ProviderBlockSchema = z
    .object({
        id: z.number(),
        calendarID: z.number(),
        serviceGroupID: z.number(),
        calendarTimezone: z.string(),
        start: z.string(),
        end: z.string(),
        notes: z.string().nullable().optional(),
        managed: z.boolean(),
        recurring: z.unknown().nullable().optional(),
        until: z.unknown().nullable().optional(),
        description: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        calendarID: z.number(),
        serviceGroupID: z.number(),
        calendarTimezone: z.string(),
        start: z.string(),
        end: z.string(),
        notes: z.string().optional(),
        managed: z.boolean(),
        recurring: z.unknown().optional(),
        until: z.unknown().optional(),
        description: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single calendar block.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-block',
        group: 'Blocks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.acuityscheduling.com/reference/get-blocks-id
            endpoint: `/blocks/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Block not found',
                id: input.id
            });
        }

        const providerBlock = ProviderBlockSchema.parse(response.data);

        const knownFields = ['id', 'calendarID', 'serviceGroupID', 'calendarTimezone', 'start', 'end', 'notes', 'managed', 'recurring', 'until', 'description'];

        const extraFields = Object.fromEntries(
            Object.entries(providerBlock).filter(([key]) => {
                return !knownFields.includes(key);
            })
        );

        return {
            id: providerBlock.id,
            calendarID: providerBlock.calendarID,
            serviceGroupID: providerBlock.serviceGroupID,
            calendarTimezone: providerBlock.calendarTimezone,
            start: providerBlock.start,
            end: providerBlock.end,
            managed: providerBlock.managed,
            ...(providerBlock.notes !== undefined && providerBlock.notes !== null && { notes: providerBlock.notes }),
            ...(providerBlock.recurring !== undefined && providerBlock.recurring !== null && { recurring: providerBlock.recurring }),
            ...(providerBlock.until !== undefined && providerBlock.until !== null && { until: providerBlock.until }),
            ...(providerBlock.description !== undefined && providerBlock.description !== null && { description: providerBlock.description }),
            ...extraFields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
