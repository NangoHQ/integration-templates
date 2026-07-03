import { z } from 'zod';
import { createAction } from 'nango';

const ProfileUpdateSchema = z.object({
    $distinct_id: z.string().describe('The distinct_id of the user profile to update.'),
    $token: z.string().optional().describe('Project token. Will be injected if omitted and projectToken is provided at the top level.'),
    $set: z.record(z.string(), z.unknown()).optional(),
    $set_once: z.record(z.string(), z.unknown()).optional(),
    $add: z.record(z.string(), z.unknown()).optional(),
    $append: z.record(z.string(), z.unknown()).optional(),
    $union: z.record(z.string(), z.unknown()).optional(),
    $remove: z.record(z.string(), z.unknown()).optional(),
    $unset: z.array(z.string()).optional(),
    $delete: z.union([z.string(), z.null()]).optional()
});

const InputSchema = z.object({
    updates: z.array(ProfileUpdateSchema).min(1).describe('Array of profile update objects.'),
    projectToken: z.string().optional().describe('Project token to inject into each update as $token if not already present.'),
    region: z.enum(['us', 'eu', 'in']).optional().describe('Data residency region. Defaults to us.'),
    ip: z.number().int().min(0).max(1).optional().describe('Set to 0 to disable IP-based geolocation. Defaults to 1.'),
    strict: z.number().int().min(0).max(1).optional().describe('Set to 1 to validate records and return per-record errors.'),
    verbose: z.number().int().min(0).max(1).optional().describe('Set to 1 to receive a JSON response with status and error.')
});

const OutputSchema = z.object({
    status: z.number().describe('1 on success, 0 on failure.'),
    error: z.string().optional().describe('Error message if the request was not successful.'),
    failed_records: z.array(z.record(z.string(), z.unknown())).optional().describe('Per-record validation errors when strict=1.')
});

function getBaseUrl(region: string | undefined): string {
    if (region === 'eu') {
        return 'https://api-eu.mixpanel.com';
    }
    if (region === 'in') {
        return 'https://api-in.mixpanel.com';
    }
    return 'https://api.mixpanel.com';
}

const action = createAction({
    description: 'Batch update user profiles.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profile:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const baseUrl = getBaseUrl(input.region);

        const payload = input.updates.map((update) => {
            const enriched: Record<string, unknown> = { ...update };
            if (input.projectToken && enriched['$token'] === undefined) {
                enriched['$token'] = input.projectToken;
            }
            return enriched;
        });

        const params: Record<string, string | number> = {};
        if (input.ip !== undefined) {
            params['ip'] = input.ip;
        }
        if (input.strict !== undefined) {
            params['strict'] = input.strict;
        }
        if (input.verbose !== undefined) {
            params['verbose'] = input.verbose;
        }

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/profile-batch-update
            endpoint: '/engage',
            baseUrlOverride: baseUrl,
            params,
            data: payload,
            retries: 3
        });

        if (typeof response.data === 'number') {
            return {
                status: response.data
            };
        }

        if (typeof response.data === 'object' && response.data !== null) {
            const data = response.data;
            const statusValue = 'status' in data ? data.status : undefined;
            const status = typeof statusValue === 'number' ? statusValue : Number(statusValue);
            const errorValue = 'error' in data ? data.error : undefined;
            const failedRecordsValue = 'failed_records' in data ? data.failed_records : undefined;
            return {
                status: Number.isNaN(status) ? 0 : status,
                ...(typeof errorValue === 'string' && { error: errorValue }),
                ...(Array.isArray(failedRecordsValue) && {
                    failed_records: failedRecordsValue.map((item) => (typeof item === 'object' && item !== null ? item : {}))
                })
            };
        }

        return {
            status: 0,
            error: 'Unexpected response format from Mixpanel.'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
