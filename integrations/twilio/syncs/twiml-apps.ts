import { createSync } from 'nango';
import { z } from 'zod';

const ConnectionCredentialsSchema = z.object({
    username: z.string()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const ProviderApplicationSchema = z.object({
    account_sid: z.string(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().nullable().optional(),
    message_status_callback: z.string().nullable().optional(),
    sid: z.string(),
    sms_fallback_method: z.string().optional(),
    sms_fallback_url: z.string().nullable().optional(),
    sms_method: z.string().optional(),
    sms_status_callback: z.string().nullable().optional(),
    sms_url: z.string().nullable().optional(),
    status_callback: z.string().nullable().optional(),
    status_callback_method: z.string().optional(),
    uri: z.string().optional(),
    voice_caller_id_lookup: z.boolean().optional(),
    voice_fallback_method: z.string().optional(),
    voice_fallback_url: z.string().nullable().optional(),
    voice_method: z.string().optional(),
    voice_url: z.string().nullable().optional(),
    public_application_connect_enabled: z.boolean().optional()
});

const TwimlAppSchema = z.object({
    id: z.string(),
    account_sid: z.string(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    message_status_callback: z.string().optional(),
    sid: z.string(),
    sms_fallback_method: z.string().optional(),
    sms_fallback_url: z.string().optional(),
    sms_method: z.string().optional(),
    sms_status_callback: z.string().optional(),
    sms_url: z.string().optional(),
    status_callback: z.string().optional(),
    status_callback_method: z.string().optional(),
    uri: z.string().optional(),
    voice_caller_id_lookup: z.boolean().optional(),
    voice_fallback_method: z.string().optional(),
    voice_fallback_url: z.string().optional(),
    voice_method: z.string().optional(),
    voice_url: z.string().optional(),
    public_application_connect_enabled: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync TwiML applications from Twilio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TwimlApp: TwimlAppSchema
    },
    endpoints: [
        {
            path: '/syncs/twiml-apps',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const credentials = ConnectionCredentialsSchema.safeParse(connection.credentials);
        const metadata = MetadataSchema.safeParse(await nango.getMetadata());
        const accountSid = credentials.success ? credentials.data.username : metadata.success ? metadata.data.account_sid : undefined;
        if (!accountSid) {
            throw new Error('Account SID is required: set it in connection metadata or ensure credentials include a username');
        }

        await nango.trackDeletesStart('TwimlApp');

        let endpoint = `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Applications.json`;
        let hasMore = true;

        while (hasMore) {
            // https://www.twilio.com/docs/usage/api/applications#read-multiple-application-resources
            const response = endpoint.includes('PageToken')
                ? await nango.get({ endpoint, retries: 3 })
                : await nango.get({ endpoint, params: { PageSize: 50 }, retries: 3 });

            const pageSchema = z.object({
                applications: z.array(ProviderApplicationSchema),
                next_page_uri: z.string().nullable().optional()
            });

            const parsedPage = pageSchema.safeParse(response.data);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse TwiML applications page: ${parsedPage.error.message}`);
            }

            const page = parsedPage.data;
            const apps: z.infer<typeof TwimlAppSchema>[] = [];

            for (const app of page.applications) {
                apps.push({
                    id: app.sid,
                    account_sid: app.account_sid,
                    api_version: app.api_version ?? undefined,
                    date_created: app.date_created ?? undefined,
                    date_updated: app.date_updated ?? undefined,
                    friendly_name: app.friendly_name ?? undefined,
                    message_status_callback: app.message_status_callback ?? undefined,
                    sid: app.sid,
                    sms_fallback_method: app.sms_fallback_method ?? undefined,
                    sms_fallback_url: app.sms_fallback_url ?? undefined,
                    sms_method: app.sms_method ?? undefined,
                    sms_status_callback: app.sms_status_callback ?? undefined,
                    sms_url: app.sms_url ?? undefined,
                    status_callback: app.status_callback ?? undefined,
                    status_callback_method: app.status_callback_method ?? undefined,
                    uri: app.uri ?? undefined,
                    voice_caller_id_lookup: app.voice_caller_id_lookup ?? undefined,
                    voice_fallback_method: app.voice_fallback_method ?? undefined,
                    voice_fallback_url: app.voice_fallback_url ?? undefined,
                    voice_method: app.voice_method ?? undefined,
                    voice_url: app.voice_url ?? undefined,
                    public_application_connect_enabled: app.public_application_connect_enabled ?? undefined
                });
            }

            if (apps.length > 0) {
                await nango.batchSave(apps, 'TwimlApp');
            }

            if (page.next_page_uri) {
                endpoint = page.next_page_uri;
            } else {
                hasMore = false;
            }
        }

        await nango.trackDeletesEnd('TwimlApp');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
