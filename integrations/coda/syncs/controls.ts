import { createSync } from 'nango';
import { z } from 'zod';

const ControlRefSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    href: z.string().optional(),
    name: z.string().optional(),
    parent: z
        .object({
            id: z.string().optional(),
            type: z.string().optional(),
            href: z.string().optional(),
            browserLink: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const ControlSchema = z.object({
    id: z.string().describe('e.g. ctrl-xxx'),
    type: z.string().optional(),
    href: z.string().optional(),
    name: z.string().optional(),
    controlType: z.string().optional(),
    value: z.unknown().optional(),
    parent: z
        .object({
            id: z.string().optional(),
            type: z.string().optional(),
            href: z.string().optional(),
            browserLink: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const MetadataSchema = z.object({
    docId: z.string().describe('ID of the doc to sync controls from')
});

type CursorPaginateConfig = {
    type: 'cursor';
    cursor_name_in_request: string;
    cursor_path_in_response: string;
    response_path: string;
    limit_name_in_request: string;
    limit: number;
    on_page: (paginationState: { nextPageParam?: string | number | undefined; response: unknown }) => Promise<void>;
};

const sync = createSync({
    description: 'Sync interactive controls (buttons, checkboxes, sliders) for a configured doc.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Control: ControlSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/controls'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const metadataParse = MetadataSchema.safeParse(metadata);
        if (!metadataParse.success) {
            throw new Error(`Invalid metadata: ${metadataParse.error.message}`);
        }
        const docId = metadataParse.data.docId;

        const checkpoint = await nango.getCheckpoint();
        const safeCheckpoint = checkpoint && typeof checkpoint === 'object' ? checkpoint : { cursor: '' };
        const checkpointParse = CheckpointSchema.safeParse(safeCheckpoint);
        if (!checkpointParse.success) {
            throw new Error(`Invalid checkpoint: ${checkpointParse.error.message}`);
        }

        let pageToken: string | undefined = checkpointParse.data.cursor || undefined;

        if (!pageToken) {
            await nango.trackDeletesStart('Control');
        }

        const paginate: CursorPaginateConfig = {
            type: 'cursor',
            cursor_name_in_request: 'pageToken',
            cursor_path_in_response: 'nextPageToken',
            response_path: 'items',
            limit_name_in_request: 'limit',
            limit: 100,
            on_page: async ({ nextPageParam }) => {
                pageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
            }
        };

        // https://coda.io/developers/apis/v1#tag/Controls/operation/listControls
        const proxyConfig = {
            endpoint: `/docs/${encodeURIComponent(docId)}/controls`,
            params: {
                ...(pageToken ? { pageToken } : {})
            },
            paginate,
            retries: 3
        };

        for await (const controlItems of nango.paginate(proxyConfig)) {
            if (!Array.isArray(controlItems)) {
                throw new Error('Unexpected paginate response: expected array of control items');
            }

            const controls: Array<z.infer<typeof ControlSchema>> = [];

            for (const controlItem of controlItems) {
                const refParse = ControlRefSchema.safeParse(controlItem);
                if (!refParse.success) {
                    throw new Error(`Invalid control reference: ${refParse.error.message}`);
                }
                const controlRef = refParse.data;

                // https://coda.io/developers/apis/v1#tag/Controls/operation/getControl
                const response = await nango.get({
                    endpoint: `/docs/${encodeURIComponent(docId)}/controls/${encodeURIComponent(controlRef.id)}`,
                    retries: 3
                });

                const controlParse = ControlSchema.safeParse(response.data);
                if (!controlParse.success) {
                    throw new Error(`Invalid control response for ${controlRef.id}: ${controlParse.error.message}`);
                }

                controls.push(controlParse.data);
            }

            if (controls.length > 0) {
                await nango.batchSave(controls, 'Control');
            }

            await nango.saveCheckpoint({ cursor: pageToken ?? '' });
        }

        await nango.trackDeletesEnd('Control');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
