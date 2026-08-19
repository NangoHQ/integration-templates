import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    documentIds: z.array(z.string())
});

const CheckpointSchema = z.object({
    document_index: z.number().int()
});

const ProviderDocumentSchema = z.object({
    documentId: z.string(),
    title: z.string().optional(),
    revisionId: z.string().optional(),
    suggestionsViewMode: z.string().optional(),
    tabs: z.array(z.unknown()).optional(),
    body: z.unknown().optional(),
    headers: z.record(z.string(), z.unknown()).optional(),
    footers: z.record(z.string(), z.unknown()).optional(),
    footnotes: z.record(z.string(), z.unknown()).optional(),
    lists: z.record(z.string(), z.unknown()).optional(),
    namedStyles: z.unknown().optional(),
    documentStyle: z.unknown().optional(),
    namedRanges: z.record(z.string(), z.unknown()).optional()
});

const DocumentContentSchema = z.object({
    id: z.string(),
    documentId: z.string().optional(),
    title: z.string().optional(),
    revisionId: z.string().optional(),
    suggestionsViewMode: z.string().optional(),
    tabs: z.array(z.unknown()).optional(),
    body: z.unknown().optional(),
    headers: z.record(z.string(), z.unknown()).optional(),
    footers: z.record(z.string(), z.unknown()).optional(),
    footnotes: z.record(z.string(), z.unknown()).optional(),
    lists: z.record(z.string(), z.unknown()).optional(),
    namedStyles: z.unknown().optional(),
    documentStyle: z.unknown().optional(),
    namedRanges: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync full document structure and content for document IDs supplied in connection metadata',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/document-content-by-id'
        }
    ],
    models: {
        DocumentContent: DocumentContentSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }

        const { documentIds } = parsedMetadata.data;

        if (documentIds.length === 0) {
            return;
        }

        const rawCheckpoint = await nango.getCheckpoint();
        let startIndex = 0;

        if (rawCheckpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);

            if (!parsedCheckpoint.success) {
                throw new Error(`Failed to parse checkpoint: ${parsedCheckpoint.error.message}`);
            }

            startIndex = parsedCheckpoint.data.document_index;
        }

        if (startIndex < 0 || startIndex >= documentIds.length) {
            startIndex = 0;
        }

        await nango.trackDeletesStart('DocumentContent');

        let i = startIndex;
        for (const documentId of documentIds.slice(startIndex)) {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/get
            const response = await nango.get({
                endpoint: `/v1/documents/${encodeURIComponent(documentId)}`,
                params: {
                    includeTabsContent: 'true'
                },
                retries: 3
            });

            const parsedDoc = ProviderDocumentSchema.safeParse(response.data);

            if (!parsedDoc.success) {
                throw new Error(`Failed to parse document ${documentId}: ${parsedDoc.error.message}`);
            }

            const doc = parsedDoc.data;

            await nango.batchSave(
                [
                    {
                        id: doc.documentId,
                        ...(doc.title !== undefined && { title: doc.title }),
                        ...(doc.revisionId !== undefined && { revisionId: doc.revisionId }),
                        ...(doc.suggestionsViewMode !== undefined && { suggestionsViewMode: doc.suggestionsViewMode }),
                        ...(doc.tabs !== undefined && { tabs: doc.tabs }),
                        ...(doc.body !== undefined && { body: doc.body }),
                        ...(doc.headers !== undefined && { headers: doc.headers }),
                        ...(doc.footers !== undefined && { footers: doc.footers }),
                        ...(doc.footnotes !== undefined && { footnotes: doc.footnotes }),
                        ...(doc.lists !== undefined && { lists: doc.lists }),
                        ...(doc.namedStyles !== undefined && { namedStyles: doc.namedStyles }),
                        ...(doc.documentStyle !== undefined && { documentStyle: doc.documentStyle }),
                        ...(doc.namedRanges !== undefined && { namedRanges: doc.namedRanges })
                    }
                ],
                'DocumentContent'
            );

            i = i + 1;

            await nango.saveCheckpoint({
                document_index: i
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DocumentContent');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
