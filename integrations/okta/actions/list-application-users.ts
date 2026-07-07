import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: "0oa14y5qldjOIAGrc698"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of results per page. Default is 200.')
});

const AppUserSchema = z
    .object({
        id: z.string(),
        externalId: z.string().nullable().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        scope: z.string().optional(),
        status: z.string().optional(),
        statusChanged: z.string().nullable().optional(),
        passwordChanged: z.string().nullable().optional(),
        syncState: z.string().nullable().optional(),
        lastSync: z.string().nullable().optional(),
        credentials: z
            .object({
                userName: z.string().optional()
            })
            .optional()
            .nullable(),
        profile: z.record(z.string(), z.unknown()).optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    users: z.array(AppUserSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List users assigned to an application',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/apps/#list-application-users
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/users`,
            params: {
                ...(input.cursor !== undefined && { after: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const headers = response.headers;
        const linkValue = typeof headers === 'object' && headers !== null ? headers['link'] : undefined;
        let nextCursor: string | undefined;

        if (typeof linkValue === 'string') {
            const match = linkValue.match(/<[^>]*[?&]after=([^&>]*)[^>]*>;\s*rel="next"/);
            if (match && match[1] !== undefined) {
                nextCursor = decodeURIComponent(match[1]);
            }
        }

        const rawUsers = z.array(z.unknown()).parse(response.data);
        const users = rawUsers.map((item) => AppUserSchema.parse(item));

        return {
            users,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
