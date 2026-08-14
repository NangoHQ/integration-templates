import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSettingSchema = z.object({
    kind: z.string().optional(),
    etag: z.string(),
    id: z.string(),
    value: z.string()
});

type ProviderSetting = z.infer<typeof ProviderSettingSchema>;

const ProviderSettingsEnvelopeSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    nextPageToken: z.string().optional(),
    nextSyncToken: z.string().optional(),
    items: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    syncToken: z.string()
});

const SettingSchema = z
    .object({
        id: z.string().describe('The unique identifier of the calendar user setting.'),
        etag: z.string().describe('ETag of the setting resource for concurrency control.'),
        value: z.string().describe('The current value of the setting as a UTF-8 string.')
    })
    .describe('A Google Calendar user setting that controls calendar behavior and display preferences.');

function isSyncTokenExpiredError(error: unknown): boolean {
    if (error instanceof Error && (error.message.includes('410') || error.message.includes('GONE'))) {
        return true;
    }

    if (error === null || typeof error !== 'object') {
        return false;
    }

    if ('status' in error && typeof error.status === 'number' && error.status === 410) {
        return true;
    }

    if ('code' in error && typeof error.code === 'number' && error.code === 410) {
        return true;
    }

    if ('response' in error && error.response !== null && typeof error.response === 'object') {
        const response = error.response;
        if ('status' in response && typeof response.status === 'number' && response.status === 410) {
            return true;
        }
    }

    return false;
}

const sync = createSync({
    description: 'Sync calendar settings',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Setting: SettingSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const syncToken = checkpoint && typeof checkpoint['syncToken'] === 'string' ? checkpoint['syncToken'] : undefined;

        const runWithToken = async (token: string | undefined) => {
            const isFullSync = token === undefined;
            let nextSyncToken: string | undefined;

            if (isFullSync) {
                await nango.trackDeletesStart('Setting');
            }

            const params: Record<string, string | number> = {
                maxResults: 250
            };
            if (token) {
                params['syncToken'] = token;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
                endpoint: '/calendar/v3/users/me/settings',
                params,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'pageToken',
                    cursor_path_in_response: 'nextPageToken',
                    response_path: 'items',
                    limit_name_in_request: 'maxResults',
                    limit: 250,
                    on_page: async ({ response }) => {
                        const parsed = ProviderSettingsEnvelopeSchema.safeParse(response.data);
                        if (parsed.success && parsed.data.nextSyncToken) {
                            nextSyncToken = parsed.data.nextSyncToken;
                        }
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate<ProviderSetting>(proxyConfig)) {
                const settings = page.map((record) => {
                    const parsed = ProviderSettingSchema.safeParse(record);
                    if (!parsed.success) {
                        throw new Error(`Invalid setting record: ${JSON.stringify(record)}`);
                    }

                    return {
                        id: parsed.data.id,
                        etag: parsed.data.etag,
                        value: parsed.data.value
                    };
                });

                if (settings.length > 0) {
                    await nango.batchSave(settings, 'Setting');
                }
            }

            if (isFullSync) {
                await nango.trackDeletesEnd('Setting');
            }

            if (nextSyncToken) {
                await nango.saveCheckpoint({ syncToken: nextSyncToken });
            }
        };

        // @allowTryCatch syncToken may expire (410 GONE), requiring a full re-sync without the token
        try {
            await runWithToken(syncToken);
        } catch (error) {
            if (syncToken && isSyncTokenExpiredError(error)) {
                await nango.clearCheckpoint();
                await runWithToken(undefined);
            } else {
                throw error;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
