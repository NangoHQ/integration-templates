import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('How many documents to return at maximum. Cannot exceed 100, defaults to 30.')
});

const DependentAgentSchema = z.object({
    referenced_resource_ids: z.array(z.string()).optional(),
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    created_at_unix_secs: z.number().optional(),
    access_level: z.string().optional()
});

const KnowledgeBaseDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['file', 'url', 'text', 'folder']),
    metadata: z
        .object({
            created_at_unix_secs: z.number(),
            last_updated_at_unix_secs: z.number(),
            size_bytes: z.number()
        })
        .optional(),
    supported_usages: z.array(z.string()).optional(),
    access_info: z
        .object({
            is_creator: z.boolean(),
            creator_name: z.string(),
            creator_email: z.string(),
            role: z.string(),
            anonymous_access_level_override: z.string().nullable().optional(),
            access_source: z.string().nullable().optional()
        })
        .optional(),
    folder_parent_id: z.string().nullable().optional(),
    folder_path: z.array(z.object({ id: z.string() })).optional(),
    dependent_agents: z.array(DependentAgentSchema).optional(),
    url: z.string().optional(),
    children_count: z.number().optional(),
    is_frozen: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    documents: z.array(KnowledgeBaseDocumentSchema),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(KnowledgeBaseDocumentSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List knowledge base documents.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-knowledge-base',
        method: 'GET'
    },
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/knowledge-base/list
            endpoint: '/v1/convai/knowledge-base',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size.toString() })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.documents,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor }),
            has_more: providerResponse.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
