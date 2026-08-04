import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventType: z
        .enum([
            'AVAILABILITY_EVENT',
            'CUSTOM_ALERT',
            'CUSTOM_ANNOTATION',
            'CUSTOM_CONFIGURATION',
            'CUSTOM_DEPLOYMENT',
            'CUSTOM_INFO',
            'ERROR_EVENT',
            'MARKED_FOR_TERMINATION',
            'PERFORMANCE_EVENT',
            'RESOURCE_CONTENTION_EVENT',
            'WARNING'
        ])
        .describe('The type of the event. Example: "CUSTOM_INFO"'),
    title: z.string().describe('The title of the event. Example: "Loadtest start"'),
    entitySelector: z
        .string()
        .optional()
        .describe('The entity selector defining a set of Dynatrace entities to be associated with the event. Example: "type(HOST)"'),
    properties: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('A map of event properties. Values must be strings, numbers, or booleans. Example: {"Tool":"MyLoadTool"}'),
    startTime: z.number().optional().describe('The start time of the event, in UTC milliseconds.'),
    endTime: z.number().optional().describe('The end time of the event, in UTC milliseconds.'),
    timeout: z.number().optional().describe('The timeout of the event, in minutes. Defaults to 15.')
});

const EventIngestResultSchema = z.object({
    correlationId: z.string(),
    status: z.enum(['INVALID_ENTITY_TYPE', 'INVALID_METADATA', 'INVALID_TIMESTAMPS', 'OK'])
});

const OutputSchema = z.object({
    reportCount: z.number(),
    eventIngestResults: z.array(EventIngestResultSchema)
});

const action = createAction({
    description: 'Push a custom event (info, alert, or annotation) onto one or more entities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['events.ingest'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/events-v2/post-event
            endpoint: '/api/v2/events/ingest',
            data: {
                eventType: input.eventType,
                title: input.title,
                ...(input.entitySelector !== undefined && { entitySelector: input.entitySelector }),
                ...(input.properties !== undefined && { properties: input.properties }),
                ...(input.startTime !== undefined && { startTime: input.startTime }),
                ...(input.endTime !== undefined && { endTime: input.endTime }),
                ...(input.timeout !== undefined && { timeout: input.timeout })
            },
            // Event ingestion is not idempotent, so keep retries at the minimum allowed value to limit duplicate-event risk on transient failures.
            retries: 1
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
