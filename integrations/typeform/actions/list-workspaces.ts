import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().optional().describe('Number of results to retrieve per page. Default is 10, maximum is 200.'),
    search: z.string().optional().describe('Returns items that contain the specified string.')
});

const WorkspaceFormsSchema = z.object({
    count: z.number(),
    href: z.string()
});

const WorkspaceSelfSchema = z.object({
    href: z.string()
});

const WorkspaceSchema = z.object({
    account_id: z.string(),
    forms: WorkspaceFormsSchema.optional(),
    id: z.string(),
    name: z.string(),
    self: WorkspaceSelfSchema.optional(),
    shared: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(WorkspaceSchema),
    total_items: z.number(),
    page_count: z.number(),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    total_items: z.number(),
    page_count: z.number(),
    items: z.array(WorkspaceSchema)
});

const action = createAction({
    description: 'List workspaces.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const currentPage = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(currentPage) || currentPage < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const response = await nango.get({
            // https://www.typeform.com/developers/create/reference/retrieve-workspaces/
            endpoint: '/workspaces',
            params: {
                ...(input.search !== undefined && { search: input.search }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { page: currentPage })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = currentPage < providerResponse.page_count ? String(currentPage + 1) : undefined;

        return {
            items: providerResponse.items,
            total_items: providerResponse.total_items,
            page_count: providerResponse.page_count,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
