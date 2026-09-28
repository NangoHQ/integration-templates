import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Catalog V3#ShowEntry
const InputSchema = z.object({ expand: z.boolean().optional(), id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        catalog_entry: z
            .object({
                aliases: z.array(z.string()),
                archived_at: z.string().optional(),
                attribute_values: z.record(
                    z.string(),
                    z
                        .object({
                            array_value: z.array(z.object({ label: z.string(), literal: z.string().optional() }).passthrough()).optional(),
                            value: z.object({ label: z.string(), literal: z.string().optional() }).passthrough().optional()
                        })
                        .passthrough()
                ),
                catalog_type_id: z.string(),
                created_at: z.string(),
                external_id: z.string().optional(),
                id: z.string(),
                name: z.string(),
                rank: z.number().int(),
                updated_at: z.string()
            })
            .passthrough(),
        catalog_type: z
            .object({
                annotations: z.record(z.string(), z.string()),
                categories: z.array(z.enum(['customer', 'issue-tracker', 'product-feature', 'service', 'on-call', 'team', 'user'])),
                color: z.enum(['yellow', 'green', 'blue', 'violet', 'pink', 'cyan', 'orange']),
                created_at: z.string(),
                description: z.string(),
                dynamic_resource_parameter: z.string().optional(),
                engine_resource_type: z.string(),
                estimated_count: z.number().int().optional(),
                icon: z.enum([
                    'alert',
                    'bolt',
                    'box',
                    'briefcase',
                    'browser',
                    'bulb',
                    'calendar',
                    'clock',
                    'cog',
                    'components',
                    'database',
                    'doc',
                    'email',
                    'escalation-path',
                    'files',
                    'flag',
                    'folder',
                    'globe',
                    'incident-template',
                    'money',
                    'server',
                    'severity',
                    'status-page',
                    'store',
                    'star',
                    'tag',
                    'user',
                    'users'
                ]),
                id: z.string(),
                is_editable: z.boolean(),
                is_team_type: z.boolean().optional(),
                last_synced_at: z.string().optional(),
                name: z.string(),
                owning_team_ids: z.array(z.string()).optional(),
                ranked: z.boolean(),
                registry_type: z.string().optional(),
                required_integrations: z.array(z.string()).optional(),
                schema: z
                    .object({
                        attributes: z.array(
                            z
                                .object({
                                    array: z.boolean(),
                                    backlink_attribute: z.string().optional(),
                                    id: z.string(),
                                    mode: z.enum(['', 'api', 'dashboard', 'external', 'internal', 'dynamic', 'backlink', 'path']),
                                    name: z.string(),
                                    path: z.array(z.object({ attribute_id: z.string(), attribute_name: z.string() }).passthrough()).optional(),
                                    type: z.string()
                                })
                                .passthrough()
                        ),
                        version: z.number().int()
                    })
                    .passthrough(),
                source_repo_url: z.string().optional(),
                type_name: z.string(),
                updated_at: z.string(),
                use_name_as_identifier: z.boolean()
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get catalog entry in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['expand'] !== undefined) params['expand'] = Array.isArray(input['expand']) ? input['expand'].join(',') : String(input['expand']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v3/catalog_entries/${encodeURIComponent(input['id'])}`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
