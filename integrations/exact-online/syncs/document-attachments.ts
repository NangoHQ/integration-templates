import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DocumentAttachmentSchema = z.object({
    id: z.string(),
    document: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    url: z.string().optional()
});

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const MeResponseSchema = z.object({
    d: z
        .object({
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.number().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const DocumentAttachmentPageSchema = z.array(
    z
        .object({
            ID: z.string(),
            Document: z.string().optional(),
            FileName: z.string().optional(),
            FileSize: z.number().optional(),
            Url: z.string().optional()
        })
        .passthrough()
);

const sync = createSync({
    description: 'Sync document attachment metadata as full snapshot',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DocumentAttachment: DocumentAttachmentSchema
    },
    // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=DocumentsDocumentAttachments
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/document-attachments'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointParsed.success ? checkpointParsed.data : { skip: 0 };

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=SystemUsers
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error(`Failed to parse Me response: ${meParsed.error.message}`);
        }

        const currentDivision = meParsed.data.d?.results?.[0]?.CurrentDivision;
        if (!currentDivision) {
            throw new Error('CurrentDivision not found in Me response');
        }

        let skip = checkpoint.skip;

        await nango.trackDeletesStart('DocumentAttachment');

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=DocumentsDocumentAttachments
        const proxyConfig: ProxyConfiguration = {
            // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=DocumentsDocumentAttachments
            endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/documents/DocumentAttachments`,
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'd.results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const pageParsed = DocumentAttachmentPageSchema.safeParse(page);
            if (!pageParsed.success) {
                throw new Error(`Failed to parse DocumentAttachments page: ${pageParsed.error.message}`);
            }

            const attachments = pageParsed.data.map((record) => ({
                id: record.ID,
                ...(record.Document != null && { document: record.Document }),
                ...(record.FileName != null && { fileName: record.FileName }),
                ...(record.FileSize != null && { fileSize: record.FileSize }),
                ...(record.Url != null && { url: record.Url })
            }));

            if (attachments.length > 0) {
                await nango.batchSave(attachments, 'DocumentAttachment');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DocumentAttachment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
