import { createSync, type ProxyConfiguration } from 'nango';
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

type NormalizedMacro = z.infer<typeof NormalizedMacroSchema>;

const CheckpointSchema = z.object({
    next_page: z.string()
});

const sync = createSync({
    description: 'Sync ticket macros from Zendesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        const rawCheckpoint = await nango.getCheckpoint();
        let checkpoint: z.infer<typeof CheckpointSchema> | undefined;
        if (rawCheckpoint != null) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            checkpoint = checkpointResult.data;
        }

        await nango.trackDeletesStart('Macro');

        let nextPageUrl: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/business-rules/macros/
            endpoint: '/api/v2/macros.json',
            paginate: {
                response_path: 'macros',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextPageUrl = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        if (checkpoint?.next_page) {
            const url = new URL(checkpoint.next_page);
            // Remove the limit parameter to avoid duplication with the paginator.
            url.searchParams.delete('per_page');
            const search = url.searchParams.toString();
            proxyConfig.baseUrlOverride = url.origin;
            proxyConfig.endpoint = url.pathname + (search ? `?${search}` : '');
        }

        for await (const page of nango.paginate(proxyConfig)) {
            const pageResult = z.array(_MacroSchema).safeParse(page);
            if (!pageResult.success) {
                throw new Error(`Failed to parse macros page: ${pageResult.error.message}`);
            }

            const macros: NormalizedMacro[] = pageResult.data.map((macro) => ({
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

            if (nextPageUrl !== undefined) {
                await nango.saveCheckpoint({ next_page: nextPageUrl });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Macro');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
