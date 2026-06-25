import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('How many documents to return at maximum. Cannot exceed 100, defaults to 30.')
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
    dependent_agents: z.array(z.unknown()).optional(),
    url: z.string().optional(),
    children_count: z.number().optional(),
    is_frozen: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(KnowledgeBaseDocumentSchema),
    next_cursor: z.string().optional()
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

        const data = response.data;

        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from the ElevenLabs API.'
            });
        }

        const documents = Array.isArray(data.documents) ? data.documents : [];
        const next_cursor = data.next_cursor != null && typeof data.next_cursor === 'string' ? data.next_cursor : undefined;

        const items = documents.map((doc: unknown) => {
            const parsed = KnowledgeBaseDocumentSchema.safeParse(doc);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid document in response.',
                    error: parsed.error.message
                });
            }
            return parsed.data;
        });

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
