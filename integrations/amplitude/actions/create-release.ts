import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    version: z.string().describe('The version of your product corresponding to this release. Example: "3.5"'),
    release_start: z
        .string()
        .describe('Timestamp corresponding to the start of this release in UTC. Format: yyyy-MM-dd HH:mm:ss. Example: "2022-01-01 00:00:00"'),
    release_end: z
        .string()
        .optional()
        .describe('Timestamp corresponding to the end of this release in UTC. Format: yyyy-MM-dd HH:mm:ss. Example: "2022-01-01 00:00:00"'),
    title: z.string().describe('A name for the release. Example: "Big new feature for iOS"'),
    description: z.string().optional().describe('A description for the release.'),
    platforms: z.array(z.string()).optional().describe('A list of platforms for this release. Example: ["iOS"]'),
    created_by: z.string().optional().describe('Name of the user creating the release.'),
    chart_visibility: z.boolean().optional().describe('When true, the release appears on charts as an annotation. Defaults to true.')
});

const ProviderReleaseSchema = z.object({
    id: z.string(),
    app_id: z.number(),
    org_id: z.number(),
    version: z.string(),
    release_start: z.string(),
    release_end: z.string().nullable(),
    type: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    platforms: z.array(z.string()).nullable(),
    chart_visibility: z.boolean(),
    params: z
        .object({
            created: z.number(),
            created_by: z.string().nullable(),
            last_modified: z.number(),
            last_modified_by: z.string().nullable()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    release: ProviderReleaseSchema
});

const OutputSchema = z.object({
    id: z.string(),
    app_id: z.number(),
    org_id: z.number(),
    version: z.string(),
    release_start: z.string(),
    release_end: z.string().optional(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    chart_visibility: z.boolean(),
    params: z
        .object({
            created: z.number(),
            created_by: z.string().optional(),
            last_modified: z.number(),
            last_modified_by: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a release marker in Amplitude.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-release',
        group: 'Releases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (credentials && credentials.type === 'BASIC' && credentials.username && credentials.password) {
            headers['Authorization'] = 'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');
        }

        // https://amplitude.com/docs/apis/analytics/releases
        const response = await nango.post({
            endpoint: '/api/2/release',
            headers,
            data: {
                version: input.version,
                release_start: input.release_start,
                ...(input.release_end !== undefined && { release_end: input.release_end }),
                title: input.title,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.platforms !== undefined && { platforms: input.platforms }),
                ...(input.created_by !== undefined && { created_by: input.created_by }),
                ...(input.chart_visibility !== undefined && { chart_visibility: input.chart_visibility })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Amplitude API.',
                details: parsed.error.message
            });
        }

        const providerRelease = parsed.data.release;

        return {
            id: providerRelease.id,
            app_id: providerRelease.app_id,
            org_id: providerRelease.org_id,
            version: providerRelease.version,
            release_start: providerRelease.release_start,
            ...(providerRelease.release_end != null && { release_end: providerRelease.release_end }),
            type: providerRelease.type,
            title: providerRelease.title,
            ...(providerRelease.description != null && { description: providerRelease.description }),
            ...(providerRelease.platforms != null && { platforms: providerRelease.platforms }),
            chart_visibility: providerRelease.chart_visibility,
            ...(providerRelease.params !== undefined && {
                params: {
                    created: providerRelease.params.created,
                    ...(providerRelease.params.created_by != null && { created_by: providerRelease.params.created_by }),
                    last_modified: providerRelease.params.last_modified,
                    ...(providerRelease.params.last_modified_by != null && { last_modified_by: providerRelease.params.last_modified_by })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
