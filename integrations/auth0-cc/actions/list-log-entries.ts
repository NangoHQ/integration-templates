import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max 100.'),
    q: z.string().optional().describe('Search criteria using Query String Syntax.'),
    sort: z.string().optional().describe('Sort field and order, e.g., date:-1.'),
    fields: z.string().optional().describe('Comma-separated list of fields to include or exclude.'),
    include_fields: z.boolean().optional().describe('Whether specified fields are to be included (true) or excluded (false).')
});

const LogLocationInfoSchema = z
    .object({
        country_code: z.string().optional(),
        country_code3: z.string().optional(),
        country_name: z.string().optional(),
        city_name: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        time_zone: z.string().optional(),
        continent_code: z.string().optional()
    })
    .passthrough();

const LogSecurityContextSchema = z
    .object({
        ja3: z.string().optional(),
        ja4: z.string().optional()
    })
    .passthrough();

const LogEntrySchema = z.object({
    date: z.string().optional().describe('Date when the event occurred in ISO 8601 format.'),
    type: z.string().optional().describe('Type of event.'),
    description: z.string().nullable().optional().describe('Description of this event.'),
    connection: z.string().optional().describe('Name of the connection the event relates to.'),
    connection_id: z.string().optional().describe('ID of the connection the event relates to.'),
    client_id: z.string().optional().describe('ID of the client (application).'),
    client_name: z.string().optional().describe('Name of the client (application).'),
    ip: z.string().optional().describe('IP address of the log event source.'),
    hostname: z.string().optional().describe('Hostname the event applies to.'),
    user_id: z.string().optional().describe('ID of the user involved in the event.'),
    user_name: z.string().optional().describe('Name of the user involved in the event.'),
    audience: z.string().optional().describe('API audience the event applies to.'),
    scope: z.string().optional().describe('Scope permissions applied to the event.'),
    strategy: z.string().optional().describe('Name of the strategy involved in the event.'),
    strategy_type: z.string().optional().describe('Type of strategy involved in the event.'),
    log_id: z.string().optional().describe('Unique ID of the event.'),
    isMobile: z.boolean().optional().describe('Whether the client was a mobile device.'),
    details: z.record(z.string(), z.unknown()).optional().describe('Additional details about this event.'),
    user_agent: z.string().optional().describe('User agent string from the client device.'),
    security_context: LogSecurityContextSchema.optional().describe('Information about security-related signals.'),
    location_info: LogLocationInfoSchema.optional().describe('Information about the location that triggered this event.')
});

const DirectArrayResponseSchema = z.array(z.unknown());
const PaginatedResponseSchema = z.object({
    logs: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(LogEntrySchema),
    next_cursor: z.string().optional().describe('Cursor to retrieve the next page of results.')
});

const action = createAction({
    description: 'List log entries from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-log-entries',
        group: 'Logs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:logs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(page) || page < 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a non-negative integer string'
            });
        }

        const perPage = input.per_page ?? 50;

        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/logs/get-logs
            endpoint: '/api/v2/logs',
            params: {
                page: String(page),
                per_page: String(perPage),
                ...(input.q !== undefined && { q: input.q }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.include_fields !== undefined && { include_fields: String(input.include_fields) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawData = response.data;

        let rawLogs: unknown[];
        const directParse = DirectArrayResponseSchema.safeParse(rawData);
        if (directParse.success) {
            rawLogs = directParse.data;
        } else {
            const paginatedParse = PaginatedResponseSchema.safeParse(rawData);
            if (paginatedParse.success) {
                rawLogs = paginatedParse.data.logs;
            } else {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response shape from Auth0 logs endpoint'
                });
            }
        }

        const items = rawLogs.map((item) => LogEntrySchema.parse(item));
        const nextCursor = items.length === perPage ? String(page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
