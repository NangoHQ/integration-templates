import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderHistorySchema = z.object({
    history_item_id: z.string(),
    request_id: z.string().nullable().optional(),
    voice_id: z.string().nullable().optional(),
    model_id: z.string().nullable().optional(),
    voice_name: z.string().nullable().optional(),
    voice_category: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    date_unix: z.number(),
    character_count_change_from: z.number(),
    character_count_change_to: z.number(),
    content_type: z.string(),
    state: z.unknown().optional(),
    settings: z.record(z.string(), z.unknown()).nullable().optional(),
    feedback: z.object({}).passthrough().nullable().optional(),
    share_link_id: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    alignments: z.object({}).passthrough().nullable().optional(),
    dialogue: z.array(z.object({}).passthrough()).nullable().optional(),
    output_format: z.string().nullable().optional()
});

const HistorySchema = z.object({
    id: z.string().describe('The stable ID of the history item.'),
    history_item_id: z.string().describe('The ID of the history item.'),
    request_id: z.string().nullable().optional(),
    voice_id: z.string().nullable().optional(),
    model_id: z.string().nullable().optional(),
    voice_name: z.string().nullable().optional(),
    voice_category: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    date_unix: z.number().describe('Unix timestamp of when the item was created.'),
    character_count_change_from: z.number(),
    character_count_change_to: z.number(),
    content_type: z.string(),
    state: z.unknown().optional(),
    settings: z.record(z.string(), z.unknown()).nullable().optional(),
    feedback: z.object({}).passthrough().nullable().optional(),
    share_link_id: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    alignments: z.object({}).passthrough().nullable().optional(),
    dialogue: z.array(z.object({}).passthrough()).nullable().optional(),
    output_format: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    last_history_item_id: z.string()
});

const sync = createSync({
    description: 'Sync history.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        History: HistorySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let lastHistoryItemId: string | undefined = checkpoint == null ? undefined : CheckpointSchema.parse(checkpoint).last_history_item_id;

        await nango.trackDeletesStart('History');

        const proxyConfig: ProxyConfiguration = {
            // https://elevenlabs.io/docs/api-reference/history/list
            endpoint: '/v1/history',
            params: {
                ...(lastHistoryItemId != null && { start_after_history_item_id: lastHistoryItemId })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'start_after_history_item_id',
                cursor_path_in_response: 'last_history_item_id',
                response_path: 'history',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        lastHistoryItemId = nextPageParam;
                    } else {
                        lastHistoryItemId = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const records = page.map((item: unknown) => {
                const validated = ProviderHistorySchema.parse(item);
                const record: {
                    id: string;
                    history_item_id: string;
                    date_unix: number;
                    character_count_change_from: number;
                    character_count_change_to: number;
                    content_type: string;
                    request_id?: string;
                    voice_id?: string;
                    model_id?: string;
                    voice_name?: string;
                    voice_category?: string;
                    text?: string;
                    state?: unknown;
                    settings?: Record<string, unknown>;
                    feedback?: Record<string, unknown>;
                    share_link_id?: string;
                    source?: string;
                    alignments?: Record<string, unknown>;
                    dialogue?: Record<string, unknown>[];
                    output_format?: string;
                } = {
                    id: validated.history_item_id,
                    history_item_id: validated.history_item_id,
                    date_unix: validated.date_unix,
                    character_count_change_from: validated.character_count_change_from,
                    character_count_change_to: validated.character_count_change_to,
                    content_type: validated.content_type
                };

                if (validated.request_id != null) {
                    record.request_id = validated.request_id;
                }
                if (validated.voice_id != null) {
                    record.voice_id = validated.voice_id;
                }
                if (validated.model_id != null) {
                    record.model_id = validated.model_id;
                }
                if (validated.voice_name != null) {
                    record.voice_name = validated.voice_name;
                }
                if (validated.voice_category != null) {
                    record.voice_category = validated.voice_category;
                }
                if (validated.text != null) {
                    record.text = validated.text;
                }
                if (validated.state !== undefined) {
                    record.state = validated.state;
                }
                if (validated.settings != null) {
                    record.settings = validated.settings;
                }
                if (validated.feedback != null) {
                    record.feedback = validated.feedback;
                }
                if (validated.share_link_id != null) {
                    record.share_link_id = validated.share_link_id;
                }
                if (validated.source != null) {
                    record.source = validated.source;
                }
                if (validated.alignments != null) {
                    record.alignments = validated.alignments;
                }
                if (validated.dialogue != null) {
                    record.dialogue = validated.dialogue;
                }
                if (validated.output_format != null) {
                    record.output_format = validated.output_format;
                }

                return record;
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'History');
            }

            if (lastHistoryItemId !== undefined) {
                await nango.saveCheckpoint({
                    last_history_item_id: lastHistoryItemId
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('History');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
