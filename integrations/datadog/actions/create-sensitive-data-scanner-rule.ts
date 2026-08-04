import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.string().describe('Sensitive Data Scanner group ID. Example: "f5912e53-b3ad-4c19-b9d8-0dce6e5e238a"'),
    name: z.string().describe('Name of the scanning rule.'),
    pattern: z.string().describe('Regular expression pattern to detect sensitive data.'),
    namespaces: z.array(z.string()).optional().describe('List of namespaces to scan.'),
    excluded_namespaces: z.array(z.string()).optional().describe('List of namespaces to exclude from scanning.'),
    text_replacement: z
        .object({
            type: z.string().describe('Redaction type. Example: "none", "hash", "partial_hash_from_beginning", "partial_hash_from_end", "replacement_string".')
        })
        .optional()
        .describe('Text replacement configuration for redaction.'),
    tags: z.array(z.string()).optional().describe('Tags to associate with the rule.'),
    is_enabled: z.boolean().optional().default(true).describe('Whether the rule is enabled.'),
    priority: z.number().optional().default(1).describe('Priority of the rule.')
});

const ProviderRuleSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
        name: z.string(),
        pattern: z.string(),
        namespaces: z.array(z.string()).optional().nullable(),
        excluded_namespaces: z.array(z.string()).optional().nullable(),
        text_replacement: z
            .object({
                type: z.string()
            })
            .optional()
            .nullable(),
        tags: z.array(z.string()).optional().nullable(),
        is_enabled: z.boolean(),
        priority: z.number()
    }),
    relationships: z.object({
        group: z.object({
            data: z.object({
                id: z.string(),
                type: z.string()
            })
        })
    })
});

const ProviderResponseSchema = z.object({
    data: ProviderRuleSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    pattern: z.string(),
    group_id: z.string(),
    is_enabled: z.boolean(),
    priority: z.number(),
    namespaces: z.array(z.string()).optional(),
    excluded_namespaces: z.array(z.string()).optional(),
    text_replacement: z
        .object({
            type: z.string()
        })
        .optional(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a new scanning rule within a group (a pattern to detect and optionally redact).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            data: {
                type: 'sensitive_data_scanner_rule',
                attributes: {
                    name: input.name,
                    pattern: input.pattern,
                    ...(input.namespaces !== undefined && { namespaces: input.namespaces }),
                    ...(input.excluded_namespaces !== undefined && { excluded_namespaces: input.excluded_namespaces }),
                    ...(input.text_replacement !== undefined && { text_replacement: input.text_replacement }),
                    ...(input.tags !== undefined && { tags: input.tags }),
                    is_enabled: input.is_enabled,
                    priority: input.priority
                },
                relationships: {
                    group: {
                        data: {
                            id: input.group_id,
                            type: 'sensitive_data_scanner_group'
                        }
                    }
                }
            }
        };

        // https://docs.datadoghq.com/api/latest/sensitive-data-scanner/#create-scanning-rule
        const response = await nango.post({
            endpoint: 'v2/sensitive-data-scanner/config/rules',
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const rule = parsed.data;
        const attributes = rule.attributes;

        return {
            id: rule.id,
            name: attributes.name,
            pattern: attributes.pattern,
            group_id: rule.relationships.group.data.id,
            is_enabled: attributes.is_enabled,
            priority: attributes.priority,
            ...(attributes.namespaces != null && { namespaces: attributes.namespaces }),
            ...(attributes.excluded_namespaces != null && { excluded_namespaces: attributes.excluded_namespaces }),
            ...(attributes.text_replacement != null && { text_replacement: attributes.text_replacement }),
            ...(attributes.tags != null && { tags: attributes.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
