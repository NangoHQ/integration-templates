import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    log_id: z.string().describe('The unique log_id of the log entry to retrieve. Example: "9002021011123456789012345678"')
});

const ProviderLogSchema = z
    .object({
        date: z.union([z.string(), z.object({}).passthrough()]).optional(),
        type: z.string().optional(),
        description: z.string().nullable().optional(),
        connection: z.string().optional(),
        connection_id: z.string().optional(),
        client_id: z.string().optional(),
        client_name: z.string().optional(),
        ip: z.string().optional(),
        hostname: z.string().optional(),
        user_id: z.string().optional(),
        user_name: z.string().optional(),
        audience: z.string().optional(),
        scope: z.string().optional(),
        strategy: z.string().optional(),
        strategy_type: z.string().optional(),
        log_id: z.string().optional(),
        isMobile: z.boolean().optional(),
        details: z.object({}).passthrough().optional(),
        user_agent: z.string().optional(),
        security_context: z
            .object({
                ja3: z.string().optional(),
                ja4: z.string().optional()
            })
            .passthrough()
            .optional(),
        location_info: z
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
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        date: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        connection: z.string().optional(),
        connection_id: z.string().optional(),
        client_id: z.string().optional(),
        client_name: z.string().optional(),
        ip: z.string().optional(),
        hostname: z.string().optional(),
        user_id: z.string().optional(),
        user_name: z.string().optional(),
        audience: z.string().optional(),
        scope: z.string().optional(),
        strategy: z.string().optional(),
        strategy_type: z.string().optional(),
        log_id: z.string().optional(),
        isMobile: z.boolean().optional(),
        details: z.record(z.string(), z.unknown()).optional(),
        user_agent: z.string().optional(),
        security_context: z.record(z.string(), z.unknown()).optional(),
        location_info: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single log entry from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-log-entry',
        group: 'Logs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:logs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/logs/get-logs-by-id
        const response = await nango.get({
            endpoint: `/api/v2/logs/${encodeURIComponent(input.log_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Log entry not found',
                log_id: input.log_id
            });
        }

        const log = ProviderLogSchema.parse(response.data);

        return {
            ...log,
            description: log.description === null ? undefined : log.description
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
