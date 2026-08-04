import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().optional().describe('Start of the requested timeframe. Example: "now-2h"'),
    to: z.string().optional().describe('End of the requested timeframe. Example: "now"'),
    eventSelector: z.string().optional().describe('Event selector string. Example: \'eventType("PROCESS_RESTART")\''),
    entitySelector: z.string().optional().describe('Entity selector string. Example: \'type("HOST")\''),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(1000).optional().describe('Amount of events per page. Max 1000.')
});

const ProviderEntityIdSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ProviderEntityStubSchema = z.object({
    entityId: ProviderEntityIdSchema.optional(),
    name: z.string().optional()
});

const ProviderMETagSchema = z.object({
    context: z.string().optional(),
    key: z.string().optional(),
    value: z.string().optional(),
    stringRepresentation: z.string().optional()
});

const ProviderManagementZoneSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const ProviderEventPropertySchema = z.object({
    key: z.string().optional(),
    value: z.string().optional()
});

const ProviderEventSchema = z.object({
    eventId: z.string(),
    startTime: z.number().optional(),
    endTime: z.number().nullable().optional(),
    eventType: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    frequentEvent: z.boolean().optional(),
    suppressAlert: z.boolean().optional(),
    suppressProblem: z.boolean().optional(),
    underMaintenance: z.boolean().optional(),
    correlationId: z.string().optional(),
    entityId: ProviderEntityStubSchema.optional(),
    entityTags: z.array(ProviderMETagSchema).optional(),
    managementZones: z.array(ProviderManagementZoneSchema).optional(),
    properties: z.array(ProviderEventPropertySchema).optional()
});

const ProviderEventListSchema = z.object({
    events: z.array(ProviderEventSchema),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional(),
    warnings: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    events: z.array(ProviderEventSchema),
    nextPageKey: z.string().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List events (including ingested custom events) in a time window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['events.read'],

    exec: async (nango, input) => {
        const params: { nextPageKey?: string; from?: string; to?: string; eventSelector?: string; entitySelector?: string; pageSize?: number } = {};
        if (input.cursor) {
            params.nextPageKey = input.cursor;
        } else {
            if (input.from !== undefined) {
                params.from = input.from;
            }
            if (input.to !== undefined) {
                params.to = input.to;
            }
            if (input.eventSelector !== undefined) {
                params.eventSelector = input.eventSelector;
            }
            if (input.entitySelector !== undefined) {
                params.entitySelector = input.entitySelector;
            }
            if (input.pageSize !== undefined) {
                params.pageSize = input.pageSize;
            }
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/events-v2/get-events
            endpoint: '/api/v2/events',
            params,
            retries: 3
        });

        const providerList = ProviderEventListSchema.parse(response.data);

        return {
            events: providerList.events,
            ...(providerList.nextPageKey !== undefined && providerList.nextPageKey !== null && { nextPageKey: providerList.nextPageKey }),
            ...(providerList.pageSize !== undefined && { pageSize: providerList.pageSize }),
            ...(providerList.totalCount !== undefined && { totalCount: providerList.totalCount }),
            ...(providerList.warnings !== undefined && { warnings: providerList.warnings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
