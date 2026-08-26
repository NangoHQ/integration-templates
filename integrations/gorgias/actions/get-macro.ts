import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the macro to retrieve. Example: 374421')
    })
    .describe('Input for retrieving a single macro by its ID.');

const MacroTagSchema = z.object({
    id: z.number().describe('Unique identifier of the tag.'),
    name: z.string().describe('Name of the tag.'),
    uri: z.string().describe('API URI of the tag.')
});

const ProviderMacroSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    tags: z.array(MacroTagSchema).optional(),
    uri: z.string().optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    public: z.boolean().nullable().optional(),
    shared: z.boolean().nullable().optional(),
    position: z.number().nullable().optional(),
    usage: z.number().nullable().optional(),
    actions: z.array(z.unknown()).optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the macro.'),
        name: z.string().optional().describe('Name of the macro.'),
        description: z.string().optional().describe('Description of the macro.'),
        text: z.string().optional().describe('Body text expanded by the macro.'),
        tags: z
            .array(
                z.object({
                    id: z.number().describe('Unique identifier of the tag.'),
                    name: z.string().describe('Name of the tag.'),
                    uri: z.string().describe('API URI of the tag.')
                })
            )
            .optional()
            .describe('Tags attached to the macro.'),
        uri: z.string().optional().describe('API URI of the macro.'),
        created_datetime: z.string().optional().describe('ISO 8601 timestamp when the macro was created.'),
        updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the macro was last updated.'),
        public: z.boolean().optional().describe('Whether the macro is publicly available.'),
        shared: z.boolean().optional().describe('Whether the macro is shared across the team.'),
        position: z.number().optional().describe('Display position of the macro.'),
        usage: z.number().optional().describe('Number of times the macro has been used.'),
        actions: z.array(z.unknown()).optional().describe('Automated actions triggered by the macro.')
    })
    .describe('A single macro retrieved from the Gorgias API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single macro by its ID.
 * @pitfalls: Retrieved macros may store their body content in `actions[].arguments` instead of the `text` field.
 */
const action = createAction({
    description: 'Retrieve a single macro.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-macro
            endpoint: `/api/macros/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Macro not found',
                id: input.id
            });
        }

        const macro = ProviderMacroSchema.parse(response.data);

        return {
            id: macro.id,
            ...(macro.name != null && { name: macro.name }),
            ...(macro.description != null && { description: macro.description }),
            ...(macro.text != null && { text: macro.text }),
            ...(macro.tags !== undefined && { tags: macro.tags }),
            ...(macro.uri !== undefined && { uri: macro.uri }),
            ...(macro.created_datetime != null && { created_datetime: macro.created_datetime }),
            ...(macro.updated_datetime != null && { updated_datetime: macro.updated_datetime }),
            ...(macro.public != null && { public: macro.public }),
            ...(macro.shared != null && { shared: macro.shared }),
            ...(macro.position != null && { position: macro.position }),
            ...(macro.usage != null && { usage: macro.usage }),
            ...(macro.actions !== undefined && { actions: macro.actions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
