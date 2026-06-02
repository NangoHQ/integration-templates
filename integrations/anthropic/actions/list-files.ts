import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Number of items to return per page. Defaults to 20. Ranges from 1 to 1000.'),
    scope_id: z.string().optional().describe('Filter by scope ID. Only returns files associated with the specified scope (e.g., a session ID).')
});

const ScopeSchema = z.object({
    id: z.string(),
    type: z.string()
});

const FileMetadataSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    filename: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    type: z.string(),
    downloadable: z.boolean().optional(),
    scope: ScopeSchema.nullable().optional()
});

const OutputSchema = z.object({
    files: z.array(FileMetadataSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    data: z.array(z.unknown()),
    has_more: z.boolean().optional(),
    last_id: z.string().optional(),
    first_id: z.string().optional()
});

const action = createAction({
    description: 'List files from Anthropic.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-files'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.anthropic.com/en/api/files
            endpoint: '/v1/files',
            params: {
                ...(input.cursor !== undefined && { after_id: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.scope_id !== undefined && { scope_id: input.scope_id })
            },
            headers: {
                'anthropic-beta': 'files-api-2025-04-14'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsedResponse = ListResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Anthropic list files response'
            });
        }

        const files = parsedResponse.data.data.map((item) => {
            const parsedFile = FileMetadataSchema.safeParse(item);
            if (!parsedFile.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse file metadata item'
                });
            }
            return parsedFile.data;
        });

        return {
            files,
            ...(parsedResponse.data.has_more === true && parsedResponse.data.last_id !== undefined && { next_cursor: parsedResponse.data.last_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
