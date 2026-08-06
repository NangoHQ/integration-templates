import { createSync } from 'nango';
import { z } from 'zod';

const SubAccountSchema = z.object({
    id: z.string(),
    account_name: z.string().optional(),
    account_number: z.number().optional(),
    account_type: z.string().optional(),
    seats: z.number().optional(),
    sub_account_token: z.string().optional()
});

const ProviderResponseSchema = z.object({
    accounts: z.array(SubAccountSchema),
    next_page_token: z.string().optional()
});

const CheckpointSchema = z.object({
    next_page_token: z.string()
});

const sync = createSync({
    description: 'Sync sub-accounts managed by this master account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SubAccount: SubAccountSchema
    },

    exec: async (nango) => {
        // Provider limitation: GET v2/accounts does not document an incremental
        // or modified-since filter, so this stays a full refresh. We only use
        // checkpoints to resume from the saved page token if a run is interrupted.
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint == null ? null : CheckpointSchema.safeParse(checkpoint);
        if (parsedCheckpoint && !parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        let nextPageToken = parsedCheckpoint?.success ? parsedCheckpoint.data.next_page_token : undefined;

        // Call unconditionally (even on a resumed run) so the deletion-tracking window always
        // covers this execution's full fetch, per Nango's guidance to call trackDeletesStart
        // before fetching any data on every execution attempt.
        await nango.trackDeletesStart('SubAccount');

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true -- terminates via the break below; guarded against a repeated cursor to avoid looping forever
        while (true) {
            // https://developers.zoom.us/docs/api/
            const response = await nango.get({
                endpoint: '/v2/accounts',
                params: {
                    page_size: 100,
                    ...(nextPageToken ? { next_page_token: nextPageToken } : {})
                },
                retries: 3
            });

            const parsedResponse = ProviderResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse sub-accounts response: ${parsedResponse.error.message}`);
            }

            const mapped: z.infer<typeof SubAccountSchema>[] = parsedResponse.data.accounts;

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'SubAccount');
            }

            const newNextPageToken = parsedResponse.data.next_page_token;

            // Guard against a provider bug returning the same cursor forever: without this,
            // a repeated next_page_token would make this loop run indefinitely.
            if (!newNextPageToken || newNextPageToken === nextPageToken) {
                break;
            }

            nextPageToken = newNextPageToken;

            await nango.saveCheckpoint({
                next_page_token: nextPageToken
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SubAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
