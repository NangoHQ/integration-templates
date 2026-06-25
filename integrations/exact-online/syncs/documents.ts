import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DocumentSchema = z.object({
    id: z.string(),
    Subject: z.string().optional(),
    DocumentDate: z.string().optional(),
    Modified: z.string()
});

const CheckpointSchema = z.object({
    modified_after: z.string()
});

const ProviderDocumentSchema = z.object({
    ID: z.string(),
    Subject: z.string().optional(),
    DocumentDate: z.string().optional(),
    Modified: z.string()
});

const MeResponseSchema = z
    .object({
        d: z.union([
            z.object({
                CurrentDivision: z.number().int()
            }),
            z.object({
                results: z
                    .array(
                        z.object({
                            CurrentDivision: z.number().int()
                        })
                    )
                    .min(1)
            })
        ])
    })
    .passthrough();

const sync = createSync({
    description: 'Sync document metadata (invoices, files) with incremental updates.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Document: DocumentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/documents'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { modified_after: '' });

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-reference
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        let division: number;
        if ('results' in meData.d) {
            const first = meData.d.results[0];
            if (first === undefined) {
                throw new Error('Me response results array is empty');
            }
            division = first.CurrentDivision;
        } else {
            division = meData.d.CurrentDivision;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-reference
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/documents/Documents`,
            params: {
                $select: 'ID,Subject,DocumentDate,Modified',
                $orderby: 'Modified asc',
                ...(checkpoint.modified_after && { $filter: `Modified gt datetime'${checkpoint.modified_after}'` })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'd.results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const documents: Array<z.infer<typeof DocumentSchema>> = [];
            for (const item of page) {
                const record = ProviderDocumentSchema.parse(item);
                documents.push({
                    id: record.ID,
                    ...(record.Subject != null && { Subject: record.Subject }),
                    ...(record.DocumentDate != null && { DocumentDate: record.DocumentDate }),
                    Modified: record.Modified
                });
            }

            const lastDocument = documents[documents.length - 1];
            if (lastDocument === undefined) {
                continue;
            }

            await nango.batchSave(documents, 'Document');
            await nango.saveCheckpoint({
                modified_after: lastDocument.Modified
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
