import { z } from 'zod';
import { createAction } from 'nango';

const EnumValueInputSchema = z.object({
    value: z.string()
});

const InputSchema = z.object({
    name: z.string(),
    field_type: z.literal('enum'),
    values: z.array(EnumValueInputSchema),
    description: z.string().optional(),
    story_types: z.array(z.enum(['feature', 'bug', 'chore'])).optional(),
    canonical_name: z.string().optional()
});

const ProviderEnumValueSchema = z.object({
    id: z.string(),
    value: z.string(),
    color_key: z.string().nullable().optional(),
    entity_type: z.string().nullable().optional(),
    position: z.number().nullable().optional()
});

const ProviderCustomFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    field_type: z.string(),
    canonical_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    enabled: z.boolean().nullable().optional(),
    entity_type: z.string().nullable().optional(),
    icon_set_identifier: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    values: z.array(ProviderEnumValueSchema).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    field_type: z.string(),
    canonical_name: z.string().optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    values: z
        .array(
            z.object({
                id: z.string(),
                value: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a workspace custom field.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const body: Record<string, unknown> = {
            name: input.name,
            field_type: input.field_type,
            values: input.values
        };

        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        if (input.story_types !== undefined) {
            body['story_types'] = input.story_types;
        }

        if (input.canonical_name !== undefined) {
            body['canonical_name'] = input.canonical_name;
        }

        // https://developer.shortcut.com/api/rest/v3
        const response = await nango.post({
            endpoint: '/api/v3/custom-fields',
            data: body,
            retries: 10
        });

        const providerField = ProviderCustomFieldSchema.parse(response.data);

        const canonical_name = providerField.canonical_name ?? undefined;
        const description = providerField.description ?? undefined;
        const enabled = providerField.enabled ?? undefined;
        const created_at = providerField.created_at ?? undefined;
        const updated_at = providerField.updated_at ?? undefined;
        const values = providerField.values ?? undefined;

        return {
            id: providerField.id,
            name: providerField.name,
            field_type: providerField.field_type,
            ...(canonical_name !== undefined && { canonical_name }),
            ...(description !== undefined && { description }),
            ...(enabled !== undefined && { enabled }),
            ...(created_at !== undefined && { created_at }),
            ...(updated_at !== undefined && { updated_at }),
            ...(values !== undefined && {
                values: values.map((v) => ({
                    id: v.id,
                    value: v.value
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
