import { z } from 'zod';
import { createAction } from 'nango';

const CustomFieldEnumValueSchema = z.object({
    id: z.string(),
    value: z.string(),
    color_key: z.string().nullable().optional(),
    entity_type: z.string().nullable().optional(),
    position: z.number().nullable().optional()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    field_type: z.string(),
    values: z.array(CustomFieldEnumValueSchema),
    story_types: z.array(z.string()).optional(),
    canonical_name: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    enabled: z.boolean().nullable().optional(),
    entity_type: z.string().nullable().optional(),
    icon_set_identifier: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const InputSchema = z.object({});

const OutputSchema = z.array(CustomFieldSchema);

const action = createAction({
    description: 'List workspace custom fields available on stories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3#List-Custom-Fields
            endpoint: '/api/v3/custom-fields',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected a flat array of custom fields from the Shortcut API.'
            });
        }

        const parsed = z.array(CustomFieldSchema).parse(response.data);

        return parsed.map((field) => ({
            id: field.id,
            name: field.name,
            field_type: field.field_type,
            values: field.values.map((val) => ({
                id: val.id,
                value: val.value,
                ...(val.color_key != null && { color_key: val.color_key }),
                ...(val.entity_type != null && { entity_type: val.entity_type }),
                ...(val.position != null && { position: val.position })
            })),
            ...(field.story_types != null && { story_types: field.story_types }),
            ...(field.canonical_name != null && { canonical_name: field.canonical_name }),
            ...(field.created_at != null && { created_at: field.created_at }),
            ...(field.description != null && { description: field.description }),
            ...(field.enabled != null && { enabled: field.enabled }),
            ...(field.entity_type != null && { entity_type: field.entity_type }),
            ...(field.icon_set_identifier != null && { icon_set_identifier: field.icon_set_identifier }),
            ...(field.position != null && { position: field.position }),
            ...(field.updated_at != null && { updated_at: field.updated_at })
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
