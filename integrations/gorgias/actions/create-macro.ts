import { z } from 'zod';
import { createAction } from 'nango';

const MacroActionInputSchema = z.object({
    name: z.string().check(z.describe('The name of the action. Example: "setResponseText"')),
    title: z.string().check(z.describe('The display title of the action. Example: "Set response text"')),
    arguments: z.record(z.string(), z.unknown()).check(z.describe('Parameters of the action. These vary according to the action name.')),
    type: z.enum(['system', 'user']).optional().check(z.describe('The type of action.')),
    description: z.string().optional().check(z.describe('Description of what the action does.'))
});

const InputSchema = z
    .object({
        name: z.string().check(z.describe('The name of the macro. Example: "Order status inquiry"')),
        actions: z.array(MacroActionInputSchema).check(z.describe('One or more actions to be applied to tickets when this macro is used.')),
        external_id: z.string().optional().check(z.describe('External ID of the macro in a foreign system. Not used by Gorgias.')),
        intent: z.string().optional().check(z.describe('The intention of the macro. Example: "discount/request".')),
        language: z.string().optional().check(z.describe('The language of the macro in ISO 639-1 format. Example: "en".'))
    })
    .check(z.describe('Input for creating a Gorgias macro.'));

const ProviderMacroActionSchema = z.object({
    arguments: z.record(z.string(), z.unknown()),
    description: z.string().nullable().optional(),
    name: z.string(),
    title: z.string(),
    type: z.enum(['system', 'user']).optional()
});

const ProviderMacroSchema = z.object({
    id: z.number(),
    external_id: z.string().nullable().optional(),
    name: z.string(),
    intent: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    usage: z.number().optional(),
    actions: z.array(ProviderMacroActionSchema).optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    archived_datetime: z.string().nullable().optional(),
    uri: z.string().optional()
});

const MacroActionOutputSchema = z.object({
    name: z.string().check(z.describe('The name of the action.')),
    title: z.string().check(z.describe('The display title of the action.')),
    arguments: z.record(z.string(), z.unknown()).check(z.describe('Parameters of the action.')),
    type: z.enum(['system', 'user']).optional().check(z.describe('The type of action.')),
    description: z.string().optional().check(z.describe('Description of what the action does.'))
});

const OutputSchema = z
    .object({
        id: z.number().check(z.describe('ID of the macro.')),
        name: z.string().check(z.describe('The name of the macro.')),
        external_id: z.string().optional().check(z.describe('External ID of the macro in a foreign system.')),
        intent: z.string().optional().check(z.describe('The intention of the macro.')),
        language: z.string().optional().check(z.describe('The language of the macro in ISO 639-1 format.')),
        usage: z.number().optional().check(z.describe('How many times the macro was applied on a ticket.')),
        actions: z.array(MacroActionOutputSchema).optional().check(z.describe('A list of actions to be applied on tickets.')),
        created_datetime: z.string().optional().check(z.describe('When the macro was created.')),
        updated_datetime: z.string().optional().check(z.describe('When the macro was last updated.')),
        archived_datetime: z.string().optional().check(z.describe('When the macro was archived.')),
        uri: z.string().optional().check(z.describe('URI of the macro.'))
    })
    .check(z.describe('The created macro returned by the Gorgias API.'));

/**
 * @tags: [write]
 * @tagReason: Creates a new macro in the provider account.
 * @pitfalls: Each action in the actions array must include a title property; omitting it causes a 400 validation error.
 */
const action = createAction({
    description: 'Create a macro with one or more actions (e.g. setResponseText).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['macros:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-macro
            endpoint: '/api/macros',
            data: {
                name: input.name,
                actions: input.actions,
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.intent !== undefined && { intent: input.intent }),
                ...(input.language !== undefined && { language: input.language })
            },
            retries: 3
        });

        const macro = ProviderMacroSchema.parse(response.data);

        return {
            id: macro.id,
            name: macro.name,
            external_id: macro.external_id ?? undefined,
            intent: macro.intent ?? undefined,
            language: macro.language ?? undefined,
            usage: macro.usage,
            actions: macro.actions?.map((item) => ({
                name: item.name,
                title: item.title,
                arguments: item.arguments,
                type: item.type,
                description: item.description ?? undefined
            })),
            created_datetime: macro.created_datetime ?? undefined,
            updated_datetime: macro.updated_datetime ?? undefined,
            archived_datetime: macro.archived_datetime ?? undefined,
            uri: macro.uri
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
