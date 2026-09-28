import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: PostmortemDocuments V1#Show
const InputSchema = z.object({ id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        postmortem_document: z
            .object({
                created_at: z.string(),
                document_url: z.string(),
                editors: z.array(
                    z
                        .object({
                            email: z.string().optional(),
                            id: z.string(),
                            name: z.string(),
                            role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                            slack_user_id: z.string().optional()
                        })
                        .passthrough()
                ),
                exported_urls: z.array(z.string()),
                id: z.string(),
                incident_id: z.string(),
                status: z.enum(['in_progress', 'in_review', 'completed']),
                title: z.string(),
                type: z.enum(['in_app', 'external']),
                updated_at: z.string()
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get postmortem document in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v1/postmortem_documents/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
