import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CallOutcomeSchema = z.object({
    id: z.string().describe('The unique call outcome identifier'),
    callOutcome: z.string().optional().describe('The call outcome name'),
    displayOrder: z.number().optional().describe('The display order of the call outcome'),
    connectStatus: z.string().optional().describe('The connection status of the call outcome'),
    sentiment: z.string().optional().describe('The sentiment of the call outcome'),
    todoAction: z.string().optional().describe('The todo action associated with the call outcome'),
    automation: z.string().nullable().optional().describe('The automation associated with the call outcome'),
    category: z.string().optional().describe('The category of the call outcome')
});

const ProviderCallOutcomeSchema = z.object({
    callOutcome: z.string().optional(),
    displayOrder: z.number().optional(),
    connectStatus: z.string().optional(),
    sentiment: z.string().optional(),
    todoAction: z.string().optional(),
    automation: z.string().nullable().optional(),
    category: z.string().optional()
});

const sync = createSync({
    description: 'Sync configured call outcomes from Gong.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CallOutcome: CallOutcomeSchema
    },

    // https://help.gong.io/apidocs/list-call-outcomes-v2call-outcomes-1
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/call-outcomes'
        }
    ],

    exec: async (nango) => {
        // Blocker: Gong /v2/call-outcomes has no updated-timestamp filter,
        // no deleted-record endpoint, and no resumable cursor across runs.
        // Outcomes rarely change, so this sync runs as a full refresh.
        await nango.trackDeletesStart('CallOutcome');

        const proxyConfig: ProxyConfiguration = {
            // https://help.gong.io/apidocs/list-call-outcomes-v2call-outcomes-1
            endpoint: '/v2/call-outcomes',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'records.cursor',
                response_path: 'outcomes',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof ProviderCallOutcomeSchema>>(proxyConfig)) {
            const outcomes: Array<z.infer<typeof CallOutcomeSchema>> = [];

            for (const record of page) {
                const parsed = ProviderCallOutcomeSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse call outcome: ${parsed.error.message}`);
                }

                const callOutcome = parsed.data.callOutcome;
                if (callOutcome) {
                    outcomes.push({
                        id: callOutcome,
                        callOutcome: callOutcome,
                        ...(parsed.data.displayOrder !== undefined && { displayOrder: parsed.data.displayOrder }),
                        ...(parsed.data.connectStatus !== undefined && { connectStatus: parsed.data.connectStatus }),
                        ...(parsed.data.sentiment !== undefined && { sentiment: parsed.data.sentiment }),
                        ...(parsed.data.todoAction !== undefined && { todoAction: parsed.data.todoAction }),
                        ...(parsed.data.automation !== undefined && { automation: parsed.data.automation }),
                        ...(parsed.data.category !== undefined && { category: parsed.data.category })
                    });
                }
            }

            if (outcomes.length > 0) {
                await nango.batchSave(outcomes, 'CallOutcome');
            }
        }

        await nango.trackDeletesEnd('CallOutcome');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
