import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CollaborationSchema = z.object({
    id: z.string(),
    type: z.string(),
    item: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string().optional()
        })
        .optional(),
    accessible_by: z
        .object({
            id: z.string().optional(),
            type: z.string(),
            name: z.string().optional(),
            login: z.string().optional()
        })
        .optional(),
    invite_email: z.string().optional(),
    role: z.string(),
    expires_at: z.string().optional(),
    is_access_only: z.boolean().optional(),
    status: z.string(),
    acknowledged_at: z.string().optional(),
    created_by: z
        .object({
            id: z.string().optional(),
            type: z.string(),
            name: z.string().optional(),
            login: z.string().optional()
        })
        .optional(),
    created_at: z.string(),
    modified_at: z.string()
});

type Collaboration = z.infer<typeof CollaborationSchema>;

const CheckpointSchema = z.object({
    offset: z.number()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const ModelsSchema = {
    Collaboration: CollaborationSchema
};

type Models = typeof ModelsSchema;

const sync = createSync<Models, undefined, typeof CheckpointSchema>({
    description: 'Sync collaborations from Box',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/collaborations',
            method: 'POST'
        }
    ],
    models: ModelsSchema,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const safeCheckpoint: Checkpoint = checkpoint ?? { offset: 0 };
        let currentOffset = safeCheckpoint.offset;

        await nango.trackDeletesStart('Collaboration');

        // https://developer.box.com/reference/get-collaborations/
        const proxyConfig: ProxyConfiguration = {
            // https://developer.box.com/reference/get-collaborations/
            endpoint: '/2.0/collaborations',
            params: {
                status: 'pending'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: currentOffset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'entries'
            },
            retries: 3
        };

        for await (const page of nango.paginate<Collaboration>(proxyConfig)) {
            const collaborations: Collaboration[] = page.map((raw) => ({
                id: raw.id,
                type: raw.type,
                ...(raw.item && {
                    item: {
                        id: raw.item.id,
                        type: raw.item.type,
                        ...(raw.item.name && { name: raw.item.name })
                    }
                }),
                ...(raw.accessible_by && {
                    accessible_by: {
                        type: raw.accessible_by.type,
                        ...(raw.accessible_by.id && { id: raw.accessible_by.id }),
                        ...(raw.accessible_by.name && { name: raw.accessible_by.name }),
                        ...(raw.accessible_by.login && { login: raw.accessible_by.login })
                    }
                }),
                ...(raw.invite_email && { invite_email: raw.invite_email }),
                role: raw.role,
                ...(raw.expires_at && { expires_at: raw.expires_at }),
                ...(raw.is_access_only !== undefined && { is_access_only: raw.is_access_only }),
                status: raw.status,
                ...(raw.acknowledged_at && { acknowledged_at: raw.acknowledged_at }),
                ...(raw.created_by && {
                    created_by: {
                        type: raw.created_by.type,
                        ...(raw.created_by.id && { id: raw.created_by.id }),
                        ...(raw.created_by.name && { name: raw.created_by.name }),
                        ...(raw.created_by.login && { login: raw.created_by.login })
                    }
                }),
                created_at: raw.created_at,
                modified_at: raw.modified_at
            }));

            if (collaborations.length > 0) {
                await nango.batchSave(collaborations, 'Collaboration');
            }

            currentOffset += page.length;
            await nango.saveCheckpoint({
                offset: currentOffset
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Collaboration');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
