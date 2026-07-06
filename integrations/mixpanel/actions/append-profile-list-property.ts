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
    distinct_id: z.string().describe('User distinct ID. Example: "13793"'),
    property: z.string().describe('Property name to append to. Example: "favorite_colors"'),
    values: z
        .array(z.union([z.string(), z.number(), z.boolean()]))
        .min(1)
        .describe('Values to append to the list. Example: ["red", "blue"]')
});

const ResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

const MetadataSchema = z.object({
    region: z.string().optional(),
    project_token: z.string().optional(),
    token: z.string().optional()
});

const action = createAction({
    description: 'Append values to a user profile list property.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const baseUrl = resolveIngestionHost(metadata.region);

        const token = metadata.project_token || metadata.token || null;

        if (!token) {
            throw new nango.ActionError({
                type: 'missing_token',
                message: 'Mixpanel project token is required in connection metadata.'
            });
        }

        const updateObjects = input.values.map((value) => ({
            $token: token,
            $distinct_id: input.distinct_id,
            $append: {
                [input.property]: value
            }
        }));

        // https://developer.mixpanel.com/reference/profile-append-to-list-property
        const response = await nango.post({
            baseUrlOverride: baseUrl,
            endpoint: '/engage',
            params: {
                ip: '0',
                verbose: '1'
            },
            data: updateObjects,
            retries: 10
        });

        const parsed = ResponseSchema.parse(response.data);

        if (parsed.status !== 1) {
            throw new nango.ActionError({
                type: 'append_failed',
                message: parsed.error || 'Profile list append failed',
                status: parsed.status
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
