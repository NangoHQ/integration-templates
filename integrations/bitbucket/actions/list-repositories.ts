import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    role: z.string().optional().describe('Filter by role: admin, contributor, member, owner'),
    q: z.string().optional().describe('Query string to filter repositories'),
    sort: z.string().optional().describe('Sort field'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 10'),
    cursor: z.string().optional().describe('Page number for pagination. Example: "2"')
});

const RepositorySchema = z
    .object({
        uuid: z.string(),
        slug: z.string(),
        name: z.string(),
        full_name: z.string(),
        description: z.string().optional().nullable(),
        is_private: z.boolean().optional(),
        created_on: z.string().optional(),
        updated_on: z.string().optional(),
        language: z.string().optional().nullable(),
        project: z.record(z.string(), z.unknown()).optional(),
        owner: z.record(z.string(), z.unknown()).optional(),
        links: z.record(z.string(), z.unknown()).optional(),
        mainbranch: z.record(z.string(), z.unknown()).optional().nullable()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(RepositorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List repositories in a workspace',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['repository'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.role !== undefined) {
            params['role'] = input.role;
        }
        if (input.q !== undefined) {
            params['q'] = input.q;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.pagelen !== undefined) {
            params['pagelen'] = input.pagelen;
        }
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
        const response = await nango.get({
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}`,
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Bitbucket API'
            });
        }

        const providerResponse = z
            .object({
                values: z.array(z.unknown()).optional(),
                next: z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.values ?? [];
        const parsedItems = items.map((item) => RepositorySchema.parse(item));

        let next_cursor: string | undefined;
        if (providerResponse.next) {
            const url = new URL(providerResponse.next);
            const page = url.searchParams.get('page');
            if (page) {
                next_cursor = page;
            }
        }

        return {
            items: parsedItems,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
