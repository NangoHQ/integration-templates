import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    accountId: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const SenderSchema = z.object({
    userName: z.string().optional(),
    email: z.string().optional(),
    userId: z.string().optional()
});

const DocumentSchema = z.object({
    documentId: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const EnvelopeSchema = z.object({
    id: z.string(),
    envelopeId: z.string(),
    status: z.string(),
    emailSubject: z.string().optional(),
    emailBlurb: z.string().optional(),
    statusChangedDateTime: z.string(),
    createdDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    completedDateTime: z.string().optional(),
    voidedDateTime: z.string().optional(),
    voidedReason: z.string().optional(),
    senderUserName: z.string().optional(),
    senderEmail: z.string().optional(),
    senderUserId: z.string().optional(),
    documents: z.array(DocumentSchema).optional()
});

const ProviderEnvelopeSchema = z.object({
    envelopeId: z.string(),
    status: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBlurb: z.string().optional(),
    statusChangedDateTime: z.string().optional(),
    createdDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    completedDateTime: z.string().optional(),
    voidedDateTime: z.string().optional(),
    voidedReason: z.string().optional(),
    sender: SenderSchema.optional(),
    documents: z.array(DocumentSchema).optional()
});

const EnvelopeListResponseSchema = z.object({
    resultSetSize: z.string().optional(),
    totalSetSize: z.string().optional(),
    startPosition: z.string().optional(),
    endPosition: z.string().optional(),
    nextUri: z.string().optional(),
    previousUri: z.string().optional(),
    envelopes: z.array(ProviderEnvelopeSchema).optional()
});

const sync = createSync({
    description: 'Sync envelope metadata incrementally by last-modified date.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Envelope: EnvelopeSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/envelopes' }],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Missing accountId in connection metadata');
        }
        const accountId = parsedMetadata.data.accountId;

        const checkpoint = await nango.getCheckpoint();
        let updatedAfter = '2000-01-01T00:00:00.0000000Z';
        if (checkpoint && typeof checkpoint === 'object' && 'updated_after' in checkpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            updatedAfter = parsedCheckpoint.data.updated_after;
        }

        let nextUri: string | undefined;
        let maxUpdatedAfter: string | undefined;

        // DocuSign nextUri omits the /restapi/v2.1 prefix so nango.paginate link pagination resolves the wrong endpoint.
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const params: Record<string, string> = {
                from_date: updatedAfter,
                status: 'any',
                order_by: 'status_changed',
                order: 'asc',
                count: '100'
            };

            let endpoint: string;
            if (nextUri) {
                const url = new URL(nextUri, 'https://demo.docusign.net');
                let path = url.pathname;
                if (!path.startsWith('/restapi/v2.1')) {
                    path = `/restapi/v2.1${path}`;
                }
                endpoint = path;
                for (const [key, value] of url.searchParams) {
                    params[key] = value;
                }
            } else {
                endpoint = `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`;
            }

            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/get/
            const response = await nango.get({
                endpoint,
                params,
                retries: 3
            });

            const parsedResponse = EnvelopeListResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid envelope list response: ${parsedResponse.error.message}`);
            }
            const data = parsedResponse.data;

            const envelopes = data.envelopes ?? [];
            if (envelopes.length === 0) {
                break;
            }

            const upserts: Array<z.infer<typeof EnvelopeSchema>> = [];
            const deletions: Array<{ id: string }> = [];

            for (const envelope of envelopes) {
                const id = envelope.envelopeId;
                const status = envelope.status?.toLowerCase() ?? '';

                const record = {
                    id,
                    envelopeId: id,
                    status: envelope.status ?? '',
                    emailSubject: envelope.emailSubject,
                    emailBlurb: envelope.emailBlurb,
                    statusChangedDateTime: envelope.statusChangedDateTime ?? '',
                    createdDateTime: envelope.createdDateTime,
                    sentDateTime: envelope.sentDateTime,
                    completedDateTime: envelope.completedDateTime,
                    voidedDateTime: envelope.voidedDateTime,
                    voidedReason: envelope.voidedReason,
                    senderUserName: envelope.sender?.userName,
                    senderEmail: envelope.sender?.email,
                    senderUserId: envelope.sender?.userId,
                    documents: envelope.documents
                };

                if (status === 'voided' || status === 'purged') {
                    deletions.push({ id });
                } else {
                    upserts.push(record);
                }

                if (envelope.statusChangedDateTime) {
                    if (maxUpdatedAfter === undefined || envelope.statusChangedDateTime > maxUpdatedAfter) {
                        maxUpdatedAfter = envelope.statusChangedDateTime;
                    }
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Envelope');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Envelope');
            }

            if (maxUpdatedAfter) {
                await nango.saveCheckpoint({ updated_after: maxUpdatedAfter });
            }

            if (!data.nextUri) {
                break;
            }

            nextUri = data.nextUri;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
