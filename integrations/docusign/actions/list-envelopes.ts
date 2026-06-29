import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from_date: z.string().optional().describe('ISO 8601 start date. Required unless envelope_ids or transaction_ids is provided.'),
    to_date: z.string().optional().describe('ISO 8601 end date.'),
    status: z.string().optional().describe('Envelope status filter, e.g. "sent", "completed", "created".'),
    folder_ids: z.string().optional().describe('Comma-separated folder IDs to filter by.'),
    envelope_ids: z.string().optional().describe('Comma-separated envelope IDs to filter by.'),
    transaction_ids: z.string().optional().describe('Comma-separated transaction IDs to filter by.'),
    cursor: z.string().optional().describe('Pagination cursor (start_position). Omit for the first page.'),
    limit: z.number().optional().describe('Number of results per page (count). Defaults to 50.')
});

const EnvelopeSchema = z
    .object({
        envelopeId: z.string(),
        status: z.string(),
        emailSubject: z.string().nullish(),
        emailBlurb: z.string().nullish(),
        sender: z
            .object({
                userName: z.string().nullish(),
                userId: z.string().nullish(),
                email: z.string().nullish()
            })
            .passthrough()
            .nullish(),
        createdDateTime: z.string().nullish(),
        sentDateTime: z.string().nullish(),
        completedDateTime: z.string().nullish(),
        statusChangedDateTime: z.string().nullish(),
        lastModifiedDateTime: z.string().nullish(),
        voidedDateTime: z.string().nullish(),
        voidedReason: z.string().nullish(),
        declinedDateTime: z.string().nullish(),
        deliveredDateTime: z.string().nullish(),
        deletedDateTime: z.string().nullish(),
        initialSentDateTime: z.string().nullish(),
        documentsUri: z.string().nullish(),
        recipientsUri: z.string().nullish(),
        envelopeUri: z.string().nullish(),
        customFieldsUri: z.string().nullish(),
        notificationUri: z.string().nullish(),
        certificateUri: z.string().nullish(),
        templatesUri: z.string().nullish(),
        documentsCombinedUri: z.string().nullish(),
        attachmentsUri: z.string().nullish(),
        customFields: z.array(z.record(z.string(), z.unknown())).nullish(),
        notification: z.record(z.string(), z.unknown()).nullish(),
        recipients: z.record(z.string(), z.unknown()).nullish()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(EnvelopeSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'Search and list envelopes with filters.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const metadata = await nango.getMetadata();
        const MetadataSchema = z
            .object({
                accountId: z.string().optional()
            })
            .optional();
        const parsedMetadata = MetadataSchema.parse(metadata ?? {});
        const accountId = parsedMetadata?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const fromDate = input.from_date;
        const envelopeIds = input.envelope_ids;
        const transactionIds = input.transaction_ids;

        if (!fromDate && !envelopeIds && !transactionIds) {
            throw new nango.ActionError({
                type: 'invalid_request',
                message: 'At least one of from_date, envelope_ids, or transaction_ids is required.'
            });
        }

        const limit = input.limit ?? 50;

        const params: Record<string, string | number> = {
            ...(fromDate && { from_date: fromDate }),
            ...(input.to_date && { to_date: input.to_date }),
            ...(input.status && { status: input.status }),
            ...(input.folder_ids && { folder_ids: input.folder_ids }),
            ...(envelopeIds && { envelope_ids: envelopeIds }),
            ...(transactionIds && { transaction_ids: transactionIds }),
            ...(input.cursor && { start_position: input.cursor }),
            count: limit
        };

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/liststatuschanges/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`,
            params,
            retries: 3
        });

        const data = response.data;

        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from DocuSign API.'
            });
        }

        const responseSchema = z.object({
            resultSetSize: z.string().nullish(),
            totalSetSize: z.string().nullish(),
            startPosition: z.string().nullish(),
            endPosition: z.string().nullish(),
            envelopes: z.array(z.unknown()).nullish()
        });

        const parsed = responseSchema.parse(data);
        const envelopes = parsed.envelopes ?? [];
        const items = envelopes.map((item) => EnvelopeSchema.parse(item));

        const totalSetSize = parseInt(parsed.totalSetSize ?? '0', 10);
        const endPosition = parseInt(parsed.endPosition ?? '0', 10);
        const nextCursor = endPosition + 1 < totalSetSize ? String(endPosition + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
