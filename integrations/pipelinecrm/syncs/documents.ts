import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderDocumentSchema = z.object({
    id: z.number().int(),
    title: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    owner_id: z.number().int().optional(),
    person_id: z.number().int().optional().nullable(),
    deal_id: z.number().int().optional().nullable(),
    company_id: z.number().int().optional().nullable(),
    calendar_entry_id: z.number().int().optional().nullable(),
    document_type: z.string().optional(),
    upload_status: z.number().int().optional(),
    upload_status_error_message: z.string().optional().nullable(),
    public_link: z.string().optional(),
    size_in_k: z.number().optional(),
    upload_state: z.string().optional(),
    etag: z.string().optional(),
    document_tag_ids: z.array(z.number().int()).optional()
});

const DocumentSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    person_id: z.string().optional(),
    deal_id: z.string().optional(),
    company_id: z.string().optional(),
    calendar_entry_id: z.string().optional(),
    document_type: z.string().optional(),
    upload_status: z.number().int().optional(),
    size_in_k: z.number().optional(),
    upload_state: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync documents (files) attached to deals/people/companies/calendar entries.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Document: DocumentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter =
            checkpoint && typeof checkpoint === 'object' && 'updated_after' in checkpoint && typeof checkpoint.updated_after === 'string'
                ? checkpoint.updated_after
                : undefined;
        const isFirstRun = updatedAfter === undefined;
        const syncStartTime = new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\.\d+Z$/, '');

        const params: { 'conditions%5Bdocument_modified%5D%5Bfrom_date%5D'?: string } = {};

        if (updatedAfter) {
            params['conditions%5Bdocument_modified%5D%5Bfrom_date%5D'] = updatedAfter;
        }

        if (isFirstRun) {
            await nango.trackDeletesStart('Document');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/documents',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'entries'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const documents: Array<z.infer<typeof DocumentSchema>> = [];

            for (const raw of page) {
                const parsed = ProviderDocumentSchema.safeParse(raw);

                if (!parsed.success) {
                    throw new Error(`Failed to parse document: ${parsed.error.message}`);
                }

                const doc = parsed.data;

                documents.push({
                    id: String(doc.id),
                    ...(doc.title != null && { title: doc.title }),
                    ...(doc.created_at != null && { created_at: doc.created_at }),
                    ...(doc.updated_at != null && { updated_at: doc.updated_at }),
                    ...(doc.person_id != null && { person_id: String(doc.person_id) }),
                    ...(doc.deal_id != null && { deal_id: String(doc.deal_id) }),
                    ...(doc.company_id != null && { company_id: String(doc.company_id) }),
                    ...(doc.calendar_entry_id != null && { calendar_entry_id: String(doc.calendar_entry_id) }),
                    ...(doc.document_type != null && { document_type: doc.document_type }),
                    ...(doc.upload_status != null && { upload_status: doc.upload_status }),
                    ...(doc.size_in_k != null && { size_in_k: doc.size_in_k }),
                    ...(doc.upload_state != null && { upload_state: doc.upload_state })
                });
            }

            if (documents.length > 0) {
                await nango.batchSave(documents, 'Document');
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Document');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartTime
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
