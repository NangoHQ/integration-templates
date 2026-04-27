import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base containing the webhook. Example: "appXXXXXXXXXXXXXX"'),
    webhookId: z.string().describe('The ID of the webhook to list payloads for. Example: "achXXXXXXXXXXXXXX"'),
    cursor: z.number().optional().describe('Pagination cursor. The cursor of the first webhook payload to retrieve. Omit for the first page.')
});

const UserSchema = z.object({
    id: z.string(),
    email: z.string(),
    permissionLevel: z.string(),
    name: z.string().optional(),
    profilePicUrl: z.string().optional()
});

const SourceMetadataSchema = z.object({
    user: UserSchema
});

const ActionMetadataSchema = z.object({
    source: z.string(),
    sourceMetadata: SourceMetadataSchema
});

// Cell values can be various types depending on the field type
const CellValueSchema = z.unknown();

// Field values can be arrays or single values depending on field type
const CellValuesByFieldIdSchema = z.record(z.string(), CellValueSchema);

const CreatedRecordSchema = z.object({
    createdTime: z.string(),
    cellValuesByFieldId: CellValuesByFieldIdSchema
});

const ChangedRecordSchema = z.object({
    current: z.object({
        cellValuesByFieldId: CellValuesByFieldIdSchema
    })
});

const ChangedTableSchema = z.object({
    createdRecordsById: z.record(z.string(), CreatedRecordSchema).optional(),
    changedRecordsById: z.record(z.string(), ChangedRecordSchema).optional(),
    destroyedRecordIds: z.array(z.string()).optional()
});

// Webhook payload as returned by Airtable API (without cursor - cursor is calculated)
const WebhookPayloadSchema = z.object({
    timestamp: z.string(),
    baseTransactionNumber: z.number(),
    payloadFormat: z.string(),
    actionMetadata: ActionMetadataSchema,
    changedTablesById: z.record(z.string(), ChangedTableSchema),
    createdTablesById: z.record(z.string(), z.unknown()).optional(),
    destroyedTableIds: z.array(z.string()).optional(),
    error: z.string().nullable().optional(),
    errorCode: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    payloads: z.array(WebhookPayloadSchema),
    mightHaveMore: z.boolean()
});

// Output payload with calculated cursor
const PayloadOutputSchema = z.object({
    timestamp: z.string(),
    baseTransactionNumber: z.number(),
    payloadFormat: z.string(),
    actionMetadata: ActionMetadataSchema,
    changedTablesById: z.record(z.string(), ChangedTableSchema),
    createdTablesById: z.record(z.string(), z.unknown()).optional(),
    destroyedTableIds: z.array(z.string()).optional(),
    error: z.string().optional(),
    errorCode: z.string().optional(),
    cursor: z.number()
});

const OutputSchema = z.object({
    payloads: z.array(PayloadOutputSchema),
    mightHaveMore: z.boolean(),
    nextCursor: z.number().optional()
});

const action = createAction({
    description: 'List delivered payload batches for an Airtable webhook',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-webhook-payloads',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        // https://airtable.com/developers/web/api/list-webhook-payloads
        const response = await nango.get({
            endpoint: `/v0/bases/${input.baseId}/webhooks/${input.webhookId}/payloads`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Airtable API',
                details: parsed.error.message
            });
        }

        const { payloads, mightHaveMore } = parsed.data;

        // Calculate starting cursor for this batch (default to 1)
        const startCursor = input.cursor ?? 1;

        // Calculate next cursor if there might be more payloads
        let nextCursor: number | undefined;
        if (mightHaveMore && payloads.length > 0) {
            nextCursor = startCursor + payloads.length;
        }

        return {
            payloads: payloads.map((payload, index) => ({
                timestamp: payload.timestamp,
                baseTransactionNumber: payload.baseTransactionNumber,
                payloadFormat: payload.payloadFormat,
                actionMetadata: payload.actionMetadata,
                changedTablesById: payload.changedTablesById,
                ...(payload.createdTablesById !== undefined && { createdTablesById: payload.createdTablesById }),
                ...(payload.destroyedTableIds !== undefined && { destroyedTableIds: payload.destroyedTableIds }),
                ...(payload.error !== null && payload.error !== undefined && { error: payload.error }),
                ...(payload.errorCode !== null && payload.errorCode !== undefined && { errorCode: payload.errorCode }),
                // Calculate cursor based on starting position + index
                cursor: startCursor + index
            })),
            mightHaveMore,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
