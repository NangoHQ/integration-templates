import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('The ID of the base. Example: "app00000000000000"'),
    webhook_id: z.string().describe('The ID of the webhook. Example: "ach00000000000001"'),
    cursor: z.number().optional().describe('The transaction number of the payload to start listing from. Omit on the first call.'),
    limit: z.number().optional().describe('Maximum number of payloads to return. Max: 50.')
});

const ActionMetadataSchema = z.object({
    source: z.string(),
    sourceMetadata: z.record(z.string(), z.unknown()).optional()
});

const PayloadSchema = z.object({
    actionMetadata: ActionMetadataSchema,
    baseTransactionNumber: z.number(),
    payloadFormat: z.string(),
    timestamp: z.string(),
    changedTablesById: z.record(z.string(), z.unknown()).optional(),
    createdTablesById: z.record(z.string(), z.unknown()).optional(),
    destroyedTableIds: z.array(z.string()).optional(),
    error: z.boolean().optional(),
    code: z.string().optional()
});

const OutputSchema = z.object({
    payloads: z.array(PayloadSchema),
    cursor: z.number(),
    might_have_more: z.boolean()
});

const action = createAction({
    description: 'List delivered payload batches for an Airtable webhook.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webhook-payloads',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://airtable.com/developers/web/api/list-webhook-payloads
            endpoint: `/v0/bases/${input.base_id}/webhooks/${input.webhook_id}/payloads`,
            params: {
                ...(input.cursor !== undefined && { cursor: String(input.cursor) }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Airtable API'
            });
        }

        const providerResponse = z
            .object({
                payloads: z.array(z.unknown()).default([]),
                cursor: z.number(),
                mightHaveMore: z.boolean()
            })
            .parse(raw);

        const payloads = providerResponse.payloads.map((item: unknown) => {
            const parsed = PayloadSchema.parse(item);
            return {
                actionMetadata: parsed.actionMetadata,
                baseTransactionNumber: parsed.baseTransactionNumber,
                payloadFormat: parsed.payloadFormat,
                timestamp: parsed.timestamp,
                ...(parsed.changedTablesById !== undefined && { changedTablesById: parsed.changedTablesById }),
                ...(parsed.createdTablesById !== undefined && { createdTablesById: parsed.createdTablesById }),
                ...(parsed.destroyedTableIds !== undefined && { destroyedTableIds: parsed.destroyedTableIds }),
                ...(parsed.error !== undefined && { error: parsed.error }),
                ...(parsed.code !== undefined && { code: parsed.code })
            };
        });

        return {
            payloads,
            cursor: providerResponse.cursor,
            might_have_more: providerResponse.mightHaveMore
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
