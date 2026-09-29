import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: PostmortemDocuments V1#List
const InputSchema = z
    .object({
        page_size: z.number().int().min(1).max(250).optional(),
        after: z.string().optional(),
        incident_id: z.string().optional(),
        sort_by: z.enum(['created_at_newest_first', 'created_at_oldest_first']).optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        pagination_meta: z.object({ after: z.string().optional(), page_size: z.number().int().max(250) }).passthrough(),
        postmortem_documents: z.array(
            z
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
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List postmortem documents in incident.io. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['page_size'] !== undefined)
            params['page_size'] = Array.isArray(input['page_size']) ? input['page_size'].join(',') : String(input['page_size']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        if (input['incident_id'] !== undefined)
            params['incident_id'] = Array.isArray(input['incident_id']) ? input['incident_id'].join(',') : String(input['incident_id']);
        if (input['sort_by'] !== undefined) params['sort_by'] = Array.isArray(input['sort_by']) ? input['sort_by'].join(',') : String(input['sort_by']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v1/postmortem_documents`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return { ...data, next_cursor: data.pagination_meta?.after || undefined };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
