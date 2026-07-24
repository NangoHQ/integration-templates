import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of aliases to return.'),
    projectId: z.string().optional().describe('Filter aliases to the given project ID.'),
    domain: z.string().optional().describe('Get only aliases for the given domain name.')
});

const AliasSchema = z
    .object({
        alias: z.string(),
        created: z.string(),
        createdAt: z.number().optional(),
        creator: z
            .object({
                email: z.string(),
                uid: z.string(),
                username: z.string()
            })
            .optional(),
        deletedAt: z.number().nullable().optional(),
        deployment: z
            .object({
                id: z.string(),
                url: z.string()
            })
            .optional(),
        deploymentId: z.string().nullable(),
        projectId: z.string().nullable(),
        redirect: z.string().nullable().optional(),
        redirectStatusCode: z.number().nullable().optional(),
        uid: z.string(),
        updatedAt: z.number().optional(),
        protectionBypass: z.object({}).passthrough().optional(),
        microfrontends: z
            .object({
                applications: z.array(z.object({}).passthrough()),
                defaultApp: z.object({ projectId: z.string() }).passthrough()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const PaginationSchema = z.object({
    count: z.number(),
    next: z.number().nullable(),
    prev: z.number().nullable()
});

const ProviderResponseSchema = z.object({
    aliases: z.array(AliasSchema),
    pagination: PaginationSchema
});

const OutputSchema = z.object({
    aliases: z.array(AliasSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List aliases across the team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['until'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.projectId !== undefined) {
            params['projectId'] = input.projectId;
        }
        if (input.domain !== undefined) {
            params['domain'] = input.domain;
        }

        // https://vercel.com/docs/rest-api/reference/endpoints/aliases/list-aliases
        const response = await nango.get({
            endpoint: '/v4/aliases',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            aliases: providerResponse.aliases,
            ...(providerResponse.pagination.next != null && { nextCursor: String(providerResponse.pagination.next) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
