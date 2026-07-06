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
    distinct_id: z.string().describe('The distinct_id of the user profile to modify. Example: "13793"'),
    properties: z.array(z.string()).min(1).describe('List of profile property names to remove. Example: ["plan", "company"]'),
    project_token: z.string().describe('The Mixpanel project token. Example: "YOUR_PROJECT_TOKEN"'),
    region: z.enum(['us', 'eu', 'in']).optional().describe('Data residency region. Defaults to the connection region or us.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

function extractRegionFromMetadata(raw: unknown): string | undefined {
    const flatSchema = z.object({ region: z.string().optional() }).passthrough();
    const nestedSchema = z
        .object({
            metadata: z.object({ region: z.string().optional() }).passthrough().optional()
        })
        .passthrough();

    const flat = flatSchema.safeParse(raw);
    if (flat.success && flat.data.region) {
        return flat.data.region;
    }

    const nested = nestedSchema.safeParse(raw);
    if (nested.success && nested.data.metadata?.region) {
        return nested.data.metadata.region;
    }

    return undefined;
}

const action = createAction({
    description: 'Delete user profile properties.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const connection = await nango.getConnection();
        const connectionSchema = z
            .object({
                connection_config: z.object({ region: z.string().optional() }).passthrough().optional()
            })
            .passthrough();
        const parsedConnection = connectionSchema.safeParse(connection);
        const connectionRegion = parsedConnection.success ? parsedConnection.data.connection_config?.region : undefined;

        const metadata = await nango.getMetadata();
        const metadataRegion = extractRegionFromMetadata(metadata);

        const region = input.region || connectionRegion || metadataRegion || 'us';
        const baseUrlOverride = resolveIngestionHost(region);

        // https://developer.mixpanel.com/reference/profile-delete-property
        const response = await nango.post({
            baseUrlOverride,
            endpoint: '/engage',
            params: {
                ip: 0,
                verbose: 1
            },
            data: [
                {
                    $token: input.project_token,
                    $distinct_id: input.distinct_id,
                    $unset: input.properties
                }
            ],
            retries: 3
        });

        const responseSchema = z.object({
            status: z.number(),
            error: z.string().nullable().optional()
        });

        const parsed = responseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Mixpanel returned an unexpected response format.',
                response: response.data
            });
        }

        if (parsed.data.status !== 1) {
            throw new nango.ActionError({
                type: 'mixpanel_error',
                message: parsed.data.error || 'Mixpanel reported a failure.',
                status: parsed.data.status
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
