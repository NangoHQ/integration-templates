import { z } from 'zod';
import { createAction } from 'nango';

function resolveIngestionHost(region: string | undefined | null): string {
    const normalized = region?.trim().toLowerCase();

    if (normalized === 'eu' || normalized === 'api-eu') {
        return 'https://api-eu.mixpanel.com';
    }

    if (normalized === 'in' || normalized === 'api-in') {
        return 'https://api-in.mixpanel.com';
    }

    return 'https://api.mixpanel.com';
}

const InputSchema = z.object({
    group_key: z.string().describe('Group key. Example: "company"'),
    group_id: z.string().describe('Group ID. Example: "acme"'),
    properties: z.array(z.string()).min(1).describe('Properties to unset. Example: ["industry", "size"]'),
    project_token: z.string().optional().describe('Mixpanel project token. Falls back to connection metadata.'),
    region: z.enum(['api', 'api-eu', 'api-in']).optional().describe('Data residency region. Defaults to api (US).')
});

const OutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

const VerboseResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const action = createAction({
    description: 'Delete group profile properties',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ project_token?: string; region?: string }>();
        const projectToken = input.project_token || metadata?.project_token;

        if (!projectToken) {
            throw new nango.ActionError({
                type: 'missing_project_token',
                message: 'Mixpanel project token is required. Provide it as input or in connection metadata.'
            });
        }

        const baseUrl = resolveIngestionHost(input.region || metadata?.region);

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/group-delete-property
            endpoint: '/groups',
            baseUrlOverride: baseUrl,
            params: {
                verbose: 1
            },
            data: [
                {
                    $token: projectToken,
                    $group_key: input.group_key,
                    $group_id: input.group_id,
                    $unset: input.properties
                }
            ],
            retries: 1
        });

        if (response.data === 1 || response.data === '1') {
            return {
                success: true
            };
        }

        if (response.data === 0 || response.data === '0') {
            return {
                success: false
            };
        }

        const parsed = VerboseResponseSchema.safeParse(response.data);
        if (parsed.success) {
            return {
                success: parsed.data.status === 1,
                ...(parsed.data.error != null && { error: parsed.data.error })
            };
        }

        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Received an unexpected response format from Mixpanel.',
            response: response.data
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
