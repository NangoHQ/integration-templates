import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).optional().describe('Filter by specific workspace IDs.'),
    kind: z.string().optional().describe('Filter by workspace kind: closed, open, or template.'),
    limit: z.number().int().optional().describe('Number of workspaces to return per page. Min: 1, max: 100, default: 25.'),
    state: z.string().optional().describe('Filter by workspace state: active, all, archived, or deleted. Default: active.'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    state: z.string().nullable().optional()
});

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    kind: z.string().optional(),
    state: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(WorkspaceSchema),
    next_page: z.string().optional()
});

const DEFAULT_LIMIT = 25;

const action = createAction({
    description: 'List workspaces from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-workspaces',
        group: 'Workspaces'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:read'],

    exec: async (nango, input) => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer representing a page number.'
            });
        }

        const args = [];
        if (input.limit !== undefined) {
            args.push(`limit: ${input.limit}`);
        }
        args.push(`page: ${page}`);
        if (input.kind !== undefined) {
            args.push(`kind: ${input.kind}`);
        }
        if (input.state !== undefined) {
            args.push(`state: ${input.state}`);
        }
        if (input.ids !== undefined && input.ids.length > 0) {
            args.push(`ids: ${JSON.stringify(input.ids)}`);
        }

        const queryArgs = args.length > 0 ? `(${args.join(', ')})` : '';
        const query = `query { workspaces${queryArgs} { id name description kind state } }`;

        const response = await nango.post({
            // https://developer.monday.com/api-reference/reference/workspaces#get-workspaces
            endpoint: '/v2',
            data: {
                query
            },
            retries: 3,
            headers: {
                'api-version': '2026-04'
            }
        });

        const ProviderResponseSchema = z.object({
            data: z
                .object({
                    workspaces: z.array(z.unknown())
                })
                .nullish(),
            errors: z.array(z.unknown()).optional()
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response from monday.com API.'
            });
        }

        if (parsedResponse.data.errors && parsedResponse.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'GraphQL errors returned by monday.com API.',
                errors: parsedResponse.data.errors
            });
        }

        const workspacesData = parsedResponse.data.data?.workspaces;
        if (!Array.isArray(workspacesData)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from monday.com API.'
            });
        }

        const workspaces = workspacesData.map((item) => {
            const parsed = ProviderWorkspaceSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Workspace item did not match expected schema.'
                });
            }
            return {
                id: parsed.data.id,
                name: parsed.data.name,
                ...(parsed.data.description != null && { description: parsed.data.description }),
                ...(parsed.data.kind != null && { kind: parsed.data.kind }),
                ...(parsed.data.state != null && { state: parsed.data.state })
            };
        });

        const limit = input.limit ?? DEFAULT_LIMIT;
        const nextPage = workspaces.length === limit ? String(page + 1) : undefined;

        return {
            items: workspaces,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
