import { z } from 'zod';
import { createAction } from 'nango';

const MacroActionInputSchema = z.object({
    arguments: z.record(z.string(), z.unknown()).describe('Parameters of the action. These vary by action name.'),
    name: z.string().describe('The name of the action.'),
    title: z.string().describe('The title of the action.'),
    type: z.enum(['system', 'user']).describe('The type of action.'),
    description: z.string().nullable().optional().describe('Description of what the action does.')
});

const MacroActionOutputSchema = z.object({
    arguments: z.record(z.string(), z.unknown()).optional().describe('Parameters of the action.'),
    name: z.string().optional().describe('The name of the action.'),
    title: z.string().optional().describe('The title of the action.'),
    type: z.enum(['system', 'user']).optional().describe('The type of action.'),
    description: z.string().nullable().optional().describe('Description of what the action does.')
});

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the macro to update.'),
        name: z.string().optional().describe('The new name of the macro.'),
        external_id: z.string().nullable().optional().describe('External ID of the macro in a foreign system.'),
        intent: z.string().nullable().optional().describe('The intention of the macro.'),
        language: z.string().nullable().optional().describe('The language of the macro in ISO 639-1 format.'),
        actions: z.array(MacroActionInputSchema).optional().describe('A list of actions to be applied on tickets.')
    })
    .describe('Input to update an existing macro.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the macro.'),
        external_id: z.string().nullable().optional().describe('External ID of the macro in a foreign system.'),
        name: z.string().optional().describe('The name of the macro.'),
        intent: z.string().nullable().optional().describe('The intention of the macro.'),
        language: z.string().nullable().optional().describe('The language of the macro in ISO 639-1 format.'),
        usage: z.number().optional().describe('How many times the macro was applied on a ticket.'),
        actions: z.array(MacroActionOutputSchema).optional().describe('A list of actions to be applied on tickets.'),
        created_datetime: z.string().nullable().optional().describe('When the macro was created.'),
        updated_datetime: z.string().nullable().optional().describe('When the macro was last updated.'),
        archived_datetime: z.string().nullable().optional().describe('When the macro was archived.'),
        uri: z.string().optional().describe('URI of the macro.')
    })
    .describe('The updated macro returned by the provider.');

const ProviderMacroSchema = z
    .object({
        id: z.number(),
        external_id: z.string().nullable().optional(),
        name: z.string().optional(),
        intent: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        usage: z.number().optional(),
        actions: z
            .array(
                z
                    .object({
                        arguments: z.record(z.string(), z.unknown()).optional(),
                        name: z.string().optional(),
                        title: z.string().optional(),
                        type: z.enum(['system', 'user']).optional(),
                        description: z.string().nullable().optional()
                    })
                    .passthrough()
            )
            .optional(),
        created_datetime: z.string().nullable().optional(),
        updated_datetime: z.string().nullable().optional(),
        archived_datetime: z.string().nullable().optional(),
        uri: z.string().optional()
    })
    .passthrough();

/**
 * @tags: [write]
 * @tagReason: Updates an existing macro by sending a PUT request to the provider.
 * @pitfalls: Archiving and unarchiving macros require separate bulk endpoints and cannot be performed through this update action.
 */
const action = createAction({
    description: "Update a macro's name, actions, tags, or language.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['macros:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};
        if (input.name !== undefined) {
            payload['name'] = input.name;
        }
        if (input.external_id !== undefined) {
            payload['external_id'] = input.external_id;
        }
        if (input.intent !== undefined) {
            payload['intent'] = input.intent;
        }
        if (input.language !== undefined) {
            payload['language'] = input.language;
        }
        if (input.actions !== undefined) {
            payload['actions'] = input.actions;
        }

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-macro
            endpoint: `/api/macros/${encodeURIComponent(String(input.id))}`,
            data: payload,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Macro not found or update failed.',
                id: input.id
            });
        }

        const providerMacro = ProviderMacroSchema.parse(response.data);

        return {
            id: providerMacro.id,
            external_id: providerMacro.external_id,
            name: providerMacro.name,
            intent: providerMacro.intent,
            language: providerMacro.language,
            usage: providerMacro.usage,
            actions: providerMacro.actions,
            created_datetime: providerMacro.created_datetime,
            updated_datetime: providerMacro.updated_datetime,
            archived_datetime: providerMacro.archived_datetime,
            uri: providerMacro.uri
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
