import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().optional().describe('Start of the requested timeframe. Example: "now-2h" or "2024-01-01T00:00:00Z"'),
    to: z.string().optional().describe('End of the requested timeframe. Example: "now" or "2024-01-01T01:00:00Z"'),
    eventSelector: z.string().optional().describe('Event selector string to filter events. Example: eventType("PROCESS_RESTART")'),
    entitySelector: z.string().optional().describe('Entity selector string to scope events to specific entities. Example: type("HOST")'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(1000).optional().describe('Number of events per page. Max 1000.')
});

const EntityIdSchema = z.object({
    id: z.string(),
    type: z.string()
});

const EntityStubSchema = z.object({
    entityId: EntityIdSchema,
    name: z.string().optional()
});

const METagSchema = z.object({
    context: z.string().optional(),
    key: z.string().optional(),
    stringRepresentation: z.string().optional(),
    value: z.string().optional()
});

const ManagementZoneSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const EventPropertySchema = z.object({
    key: z.string().optional(),
    value: z.string().optional()
});

const EventSchema = z.object({
    correlationId: z.string().optional(),
    endTime: z.number().nullable().optional(),
    entityId: EntityStubSchema.optional(),
    entityTags: z.array(METagSchema).optional(),
    eventId: z.string().optional(),
    eventType: z.string().optional(),
    frequentEvent: z.boolean().optional(),
    managementZones: z.array(ManagementZoneSchema).optional(),
    properties: z.array(EventPropertySchema).optional(),
    startTime: z.number().optional(),
    status: z.string().optional(),
    suppressAlert: z.boolean().optional(),
    suppressProblem: z.boolean().optional(),
    title: z.string().optional(),
    underMaintenance: z.boolean().optional()
});

const OutputSchema = z.object({
    events: z.array(EventSchema),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List events in a time window',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['events.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/events-v2/get-events
            endpoint: '/api/v2/events',
            params: {
                ...(input.from !== undefined && { from: input.from }),
                ...(input.to !== undefined && { to: input.to }),
                ...(input.eventSelector !== undefined && { eventSelector: input.eventSelector }),
                ...(input.entitySelector !== undefined && { entitySelector: input.entitySelector }),
                ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
                ...(input.cursor !== undefined && { nextPageKey: input.cursor })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);

        return {
            events: parsed.events,
            nextPageKey: parsed.nextPageKey,
            pageSize: parsed.pageSize,
            totalCount: parsed.totalCount,
            warnings: parsed.warnings
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
