import { createSync } from 'nango';
import * as z from 'zod';

// --- Internal provider schemas (no descriptions needed) ---

const MacroActionSchema = z.object({
    arguments: z.record(z.string(), z.unknown()).optional(),
    description: z.string().nullable().optional(),
    name: z.string(),
    title: z.string(),
    type: z.string().optional()
});

const ProviderMacroSchema = z.object({
    id: z.number().int(),
    external_id: z.string().nullable().optional(),
    name: z.string(),
    intent: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    usage: z.number().int().optional(),
    actions: z.array(MacroActionSchema).optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    archived_datetime: z.string().nullable().optional(),
    uri: z.string().optional()
});

// --- Public model schemas ---

const MacroActionSchemaPublic = z
    .object({
        arguments: z.record(z.string(), z.unknown()).optional().describe('Parameters of the action. These vary according to the action name.'),
        description: z.string().optional().describe('Description of what the action does.'),
        name: z.string().describe('The name of the action.'),
        title: z.string().describe('The title of the action.'),
        type: z.string().optional().describe('The type of action (e.g., system or user).')
    })
    .describe('A single operation that can be applied to a ticket as part of a macro.');

const MacroSchema = z
    .object({
        id: z.string().describe('Unique identifier of the macro.'),
        external_id: z.string().optional().describe('External ID of the macro in a foreign system.'),
        name: z.string().describe('The name of the macro.'),
        intent: z.string().optional().describe('The intention of the macro (e.g., discount/request, shipping/status).'),
        language: z.string().optional().describe('The language of the macro in ISO 639-1 format.'),
        usage: z.number().int().optional().describe('How many times the macro was applied on a ticket.'),
        actions: z.array(MacroActionSchemaPublic).optional().describe('A list of actions to be applied on tickets.'),
        created_datetime: z.string().optional().describe('When the macro was created.'),
        updated_datetime: z.string().optional().describe('When the macro was last updated.'),
        archived_datetime: z.string().optional().describe('When the macro was archived.'),
        uri: z.string().optional().describe('URI of the macro.')
    })
    .describe('A macro (canned response) is a list of actions that can be applied to tickets to modify them and/or reply to them.');

const sync = createSync({
    description: 'Sync macros (canned response templates).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Macro: MacroSchema
    },

    exec: async (nango) => {
        // No modified-since filter exists for macros, so this remains a full refresh.

        await nango.trackDeletesStart('Macro');

        // https://developers.gorgias.com/reference/list-macros
        for await (const page of nango.paginate({
            endpoint: '/api/macros',
            params: {
                order_by: 'updated_datetime:asc',
                limit: 100
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        })) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            const rawItems = page.map((item) => {
                const parsed = ProviderMacroSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse macro: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const macros = rawItems.map((macro) => ({
                id: String(macro.id),
                ...(macro.external_id != null && { external_id: macro.external_id }),
                name: macro.name,
                ...(macro.intent != null && { intent: macro.intent }),
                ...(macro.language != null && { language: macro.language }),
                ...(macro.usage != null && { usage: macro.usage }),
                ...(macro.actions != null && {
                    actions: macro.actions.map((action) => ({
                        ...(action.arguments != null && { arguments: action.arguments }),
                        ...(action.description != null && { description: action.description }),
                        name: action.name,
                        title: action.title,
                        type: action.type
                    }))
                }),
                ...(macro.created_datetime != null && { created_datetime: macro.created_datetime }),
                ...(macro.updated_datetime != null && { updated_datetime: macro.updated_datetime }),
                ...(macro.archived_datetime != null && { archived_datetime: macro.archived_datetime }),
                ...(macro.uri != null && { uri: macro.uri })
            }));

            if (macros.length > 0) {
                await nango.batchSave(macros, 'Macro');
            }
        }

        await nango.trackDeletesEnd('Macro');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
