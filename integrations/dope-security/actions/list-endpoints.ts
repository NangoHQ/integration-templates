import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().optional().describe('Broad search query across endpoints by device, user and email identities that contain this string (case-insensitive).'),
    emailId: z.string().optional().describe('Search by email ids that contain this string (case-insensitive).'),
    deviceName: z.string().optional().describe('Search by device names that contain this string (case-insensitive).'),
    userId: z.string().optional().describe('Search by user ids that contain this string (case-insensitive).'),
    osVersion: z.string().optional().describe('Filter by this exact device OS version string.'),
    status: z
        .array(z.enum(['healthy', 'error', 'dormant', 'disabled']))
        .optional()
        .describe('Filter by this exact set of statuses.'),
    debugState: z
        .array(z.enum(['0', '1', '2']))
        .optional()
        .describe(
            'Filter by this exact set of debug states. 0 means not in debug, 1 means debug request sent to endpoint, 2 means debug request acknowledged by endpoint.'
        ),
    fallbackMode: z.enum(['true', 'false']).optional().describe('Filter by the fallback mode.'),
    locationId: z
        .string()
        .optional()
        .describe('Filter by this exact location id - with an underscore separating the case sensitive city and country values e.g. "City_Country".'),
    agentVersion: z.string().optional().describe('Filter by this exact agent version.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().int().min(1).max(100).optional().describe('Number of records requested. The default value is 50.')
});

const AdminSetStateSchema = z.object({
    enabled: z.boolean().optional(),
    timestamp: z.string().optional()
});

const EndpointSchema = z.object({
    adminSetState: AdminSetStateSchema.optional(),
    agentUUID: z.string().optional(),
    userUUID: z.string().optional(),
    agentVersion: z.string().optional(),
    binaryType: z.string().optional(),
    cityName: z.string().optional(),
    region: z.string().optional(),
    countryName: z.string().optional(),
    cpuFamily: z.string().optional(),
    debugState: z.string().optional(),
    deviceName: z.string().optional(),
    disableMode: z.boolean().optional(),
    errorMessage: z.string().optional(),
    fallbackMode: z.boolean().optional(),
    configurationLastUpdated: z.string().optional(),
    osVersion: z.string().optional(),
    policyName: z.string().optional(),
    realtimeConnection: z.boolean().optional(),
    status: z.string().optional(),
    lastSeen: z.string().optional(),
    userId: z.string().optional(),
    emailId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(EndpointSchema),
    nextCursor: z.string().optional()
});

// https://inflight.dope.security/dope.apis/public-api-specification: /v1/endpoints/search
// accepts only one of these search parameters per request; first/cursor are pagination-only.
const SEARCH_FILTER_FIELDS: Array<keyof z.infer<typeof InputSchema>> = [
    'id',
    'emailId',
    'deviceName',
    'userId',
    'osVersion',
    'status',
    'debugState',
    'fallbackMode',
    'locationId',
    'agentVersion'
];

const action = createAction({
    description: 'List and search endpoints (managed devices) with filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const providedFilters = SEARCH_FILTER_FIELDS.filter((field) => input[field] !== undefined);
        if (providedFilters.length > 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `Only one search parameter can be specified at a time. Received: ${providedFilters.join(', ')}`
            });
        }

        const params: Record<string, string | number | string[]> = {
            ...(input.id !== undefined && { id: input.id }),
            ...(input.emailId !== undefined && { emailId: input.emailId }),
            ...(input.deviceName !== undefined && { deviceName: input.deviceName }),
            ...(input.userId !== undefined && { userId: input.userId }),
            ...(input.osVersion !== undefined && { osVersion: input.osVersion }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.debugState !== undefined && { debugState: input.debugState }),
            ...(input.fallbackMode !== undefined && { fallbackMode: input.fallbackMode }),
            ...(input.locationId !== undefined && { locationId: input.locationId }),
            ...(input.agentVersion !== undefined && { agentVersion: input.agentVersion }),
            ...(input.cursor !== undefined && { after: input.cursor }),
            ...(input.first !== undefined && { first: input.first })
        };

        const response = await nango.get({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: '/v1/endpoints/search',
            params,
            retries: 3
        });

        const responseData = z
            .object({
                data: z.object({
                    pageInfo: z.object({
                        endCursor: z.string().nullable(),
                        hasNextPage: z.boolean()
                    }),
                    endpoints: z.array(z.unknown())
                })
            })
            .parse(response.data);

        const items = responseData.data.endpoints.map((raw) => {
            return EndpointSchema.parse(raw);
        });

        return {
            items,
            ...(responseData.data.pageInfo.hasNextPage && responseData.data.pageInfo.endCursor != null && { nextCursor: responseData.data.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
