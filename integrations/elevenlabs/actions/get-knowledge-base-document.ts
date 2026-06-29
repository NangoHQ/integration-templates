import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentation_id: z.string().describe('The ID of a document from the knowledge base.'),
    agent_id: z.string().optional().describe('Optional agent ID to filter the document context.')
});

const KnowledgeBaseDocumentMetadataSchema = z.object({
    created_at_unix_secs: z.number().optional(),
    last_updated_at_unix_secs: z.number().optional(),
    size_bytes: z.number().optional()
});

const KnowledgeBaseDocumentAccessInfoSchema = z.object({
    is_creator: z.boolean().optional(),
    creator_name: z.string().nullable().optional(),
    creator_email: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    access_source: z.string().nullable().optional()
});

const FolderPathItemSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const AutoSyncInfoSchema = z.object({
    minimum_frequency_days: z.number().optional(),
    auto_remove: z.boolean().optional(),
    consec_failures: z.number().optional(),
    next_refresh_by: z.number().optional()
});

const DependentAgentSchema = z.object({
    referenced_resource_ids: z.array(z.string()).optional(),
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    created_at_unix_secs: z.number().optional(),
    access_level: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        metadata: KnowledgeBaseDocumentMetadataSchema.optional(),
        supported_usages: z.array(z.string()).optional(),
        access_info: KnowledgeBaseDocumentAccessInfoSchema.optional(),
        folder_parent_id: z.string().nullable().optional(),
        folder_path: z.array(FolderPathItemSchema).optional(),
        type: z.string().optional(),
        url: z.string().optional(),
        extracted_inner_html: z.string().optional(),
        auto_sync_info: AutoSyncInfoSchema.nullable().optional(),
        dependent_agents: z.array(DependentAgentSchema).optional(),
        is_frozen: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a knowledge base document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/knowledge-base/get-document
            endpoint: `/v1/convai/knowledge-base/${encodeURIComponent(input.documentation_id)}`,
            params: {
                ...(input.agent_id !== undefined && { agent_id: input.agent_id })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
