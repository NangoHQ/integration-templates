import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const NotebookAuthorSchema = z.object({
    handle: z.string().optional(),
    name: z.string().nullable().optional()
});

const NotebookAttributesSchema = z.object({
    name: z.string(),
    status: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    author: NotebookAuthorSchema.optional()
});

const NotebookDataSchema = z.object({
    id: z.number().int(),
    type: z.string().optional(),
    attributes: NotebookAttributesSchema
});

const NotebookSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    author_handle: z.string().optional(),
    author_name: z.string().optional()
});

const CheckpointSchema = z.object({
    start: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync notebooks in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Notebook: NotebookSchema
    },

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let start = checkpoint?.start ?? 0;

        await nango.trackDeletesStart('Notebook');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/notebooks/#get-all-notebooks
            endpoint: 'v1/notebooks',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start',
                offset_start_value: start,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const notebooks: Array<z.infer<typeof NotebookDataSchema>> = [];
            for (const item of page) {
                const parsed = NotebookDataSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse notebook: ${parsed.error.message}`);
                }
                notebooks.push(parsed.data);
            }

            const records = notebooks.map((notebook) => ({
                id: String(notebook.id),
                name: notebook.attributes.name,
                ...(notebook.attributes.status != null && { status: notebook.attributes.status }),
                ...(notebook.attributes.created != null && { created: notebook.attributes.created }),
                ...(notebook.attributes.modified != null && { modified: notebook.attributes.modified }),
                ...(notebook.attributes.author?.handle != null && { author_handle: notebook.attributes.author.handle }),
                ...(notebook.attributes.author?.name != null && { author_name: notebook.attributes.author.name })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Notebook');
                start += records.length;
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Notebook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
