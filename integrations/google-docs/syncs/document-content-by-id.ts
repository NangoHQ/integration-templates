import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    documentIds: z.array(z.string())
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

        await nango.trackDeletesStart('DocumentContent');

        const records: Array<z.infer<typeof DocumentContentSchema>> = [];

        for (const documentId of documentIds) {
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

            records.push({
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
            });
        }

        if (records.length > 0) {
            await nango.batchSave(records, 'DocumentContent');
        }

        await nango.trackDeletesEnd('DocumentContent');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
