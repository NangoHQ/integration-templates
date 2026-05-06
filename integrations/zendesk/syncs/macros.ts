import { createSync } from 'nango';
import { z } from 'zod';

// Macro model from Zendesk API
// https://developer.zendesk.com/api-reference/ticketing/business-rules/macros/
const _MacroSchema = z.object({
    id: z.number(),
    title: z.string(),
    active: z.boolean(),
    description: z.string().nullable().optional(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    actions: z
        .array(
            z.object({
                field: z.union([z.string(), z.number()]),
                value: z.unknown()
            })
        )
        .optional()
});

const NormalizedMacroSchema = z.object({
    id: z.string(),
    title: z.string(),
    active: z.boolean(),
    description: z.string().optional(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    actions: z
        .array(
            z.object({
                field: z.union([z.string(), z.number()]),
                value: z.unknown()
            })
        )
        .optional()
});

type Macro = z.infer<typeof _MacroSchema>;
type NormalizedMacro = z.infer<typeof NormalizedMacroSchema>;

const sync = createSync({
    description: 'Sync ticket macros from Zendesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Macro: NormalizedMacroSchema
    },
    endpoints: [
        {
            path: '/syncs/macros',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Full refresh for macros reference data
        // Blocker: Zendesk macros endpoint does not support incremental filtering
        // We need the complete macro set for reference lookup
        await nango.trackDeletesStart('Macro');

        // https://developer.zendesk.com/api-reference/ticketing/business-rules/macros/
        const proxyConfig = {
            endpoint: '/api/v2/macros.json',
            paginate: {
                response_path: 'macros',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<Macro>(proxyConfig)) {
            const macros: NormalizedMacro[] = page.map((macro) => ({
                id: String(macro.id),
                title: macro.title,
                active: macro.active,
                ...(macro.description != null && {
                    description: macro.description
                }),
                ...(macro.position != null && {
                    position: macro.position
                }),
                ...(macro.created_at != null && {
                    created_at: macro.created_at
                }),
                ...(macro.updated_at != null && {
                    updated_at: macro.updated_at
                }),
                ...(macro.actions != null && {
                    actions: macro.actions
                })
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
