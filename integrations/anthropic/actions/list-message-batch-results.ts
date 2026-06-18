import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    message_batch_id: z.string().describe('The ID of the Message Batch to retrieve results for. Example: "msgbatch_01AbCdEfGhIjKlMnOpQrStUv"')
});

const BatchResultSchema = z.object({
    custom_id: z.string(),
    result: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    results: z.array(BatchResultSchema)
});

const action = createAction({
    description: 'Stream or retrieve results for an Anthropic Message Batch',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.anthropic.com/en/api/message-batches
        const response = await nango.get({
            endpoint: `/v1/messages/batches/${encodeURIComponent(input.message_batch_id)}/results`,
            retries: 3
        });

        const rawData = response.data;

        if (rawData === null || rawData === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No results found for the provided message batch',
                message_batch_id: input.message_batch_id
            });
        }

        let lines: unknown[] = [];
        if (typeof rawData === 'string') {
            const trimmed = rawData.trim();
            if (trimmed.length === 0) {
                lines = [];
            } else {
                lines = trimmed.split('\n').map((line) => {
                    // @allowTryCatch The API returns newline-delimited JSON (JSONL). Individual lines may be malformed or empty,
                    // so we gracefully skip them instead of failing the entire action.
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                });
            }
        } else if (Array.isArray(rawData)) {
            lines = rawData;
        } else if (typeof rawData === 'object' && rawData !== null) {
            lines = [rawData];
        }

        const validLines = lines.filter((line): line is Record<string, unknown> => line !== null && typeof line === 'object');

        const results = validLines.map((line) => {
            const parsed = BatchResultSchema.safeParse(line);
            if (!parsed.success) {
                return {
                    custom_id: typeof line['custom_id'] === 'string' ? line['custom_id'] : 'unknown',
                    result: line
                };
            }
            return parsed.data;
        });

        return {
            results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
