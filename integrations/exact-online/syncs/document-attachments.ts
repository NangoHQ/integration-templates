import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DocumentAttachmentSchema = z.object({
    id: z.string(),
    document: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    url: z.string().optional()
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
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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

        await nango.trackDeletesStart('DocumentAttachment');

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=DocumentsDocumentAttachments
        const proxyConfig: ProxyConfiguration = {
            // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=DocumentsDocumentAttachments
            endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/documents/DocumentAttachments`,
            paginate: {
                type: 'offset',
                limit: 100,
                limit_name_in_request: '$top',
                offset_name_in_request: '$skip',
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
        }

        await nango.trackDeletesEnd('DocumentAttachment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
