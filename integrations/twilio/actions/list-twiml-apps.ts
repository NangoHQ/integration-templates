import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    friendly_name: z.string().optional().describe('The string that identifies the Application resources to read. Example: "MyApp"'),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('How many resources to return in each list page. The default is 50, and the maximum is 1000.'),
    page: z.number().int().min(0).optional().describe('The page index. This value is simply for client state.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (maps to PageToken). Omit for the first page.')
});

const ProviderAppSchema = z.object({
    account_sid: z.string().nullable().optional(),
    api_version: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    friendly_name: z.string().nullable().optional(),
    message_status_callback: z.string().nullable().optional(),
    sid: z.string().nullable().optional(),
    sms_fallback_method: z.string().nullable().optional(),
    sms_fallback_url: z.string().nullable().optional(),
    sms_method: z.string().nullable().optional(),
    sms_status_callback: z.string().nullable().optional(),
    sms_url: z.string().nullable().optional(),
    status_callback: z.string().nullable().optional(),
    status_callback_method: z.string().nullable().optional(),
    uri: z.string().nullable().optional(),
    voice_caller_id_lookup: z.boolean().nullable().optional(),
    voice_fallback_method: z.string().nullable().optional(),
    voice_fallback_url: z.string().nullable().optional(),
    voice_method: z.string().nullable().optional(),
    voice_url: z.string().nullable().optional(),
    public_application_connect_enabled: z.boolean().nullable().optional()
});

const OutputAppSchema = z.object({
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    message_status_callback: z.string().optional(),
    sid: z.string().optional(),
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

const OutputSchema = z.object({
    items: z.array(OutputAppSchema),
    next_page_token: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
    start: z.number().optional(),
    end: z.number().optional()
});

function mapProviderApp(raw: z.infer<typeof ProviderAppSchema>): z.infer<typeof OutputAppSchema> {
    return {
        ...(raw.account_sid != null && { account_sid: raw.account_sid }),
        ...(raw.api_version != null && { api_version: raw.api_version }),
        ...(raw.date_created != null && { date_created: raw.date_created }),
        ...(raw.date_updated != null && { date_updated: raw.date_updated }),
        ...(raw.friendly_name != null && { friendly_name: raw.friendly_name }),
        ...(raw.message_status_callback != null && { message_status_callback: raw.message_status_callback }),
        ...(raw.sid != null && { sid: raw.sid }),
        ...(raw.sms_fallback_method != null && { sms_fallback_method: raw.sms_fallback_method }),
        ...(raw.sms_fallback_url != null && { sms_fallback_url: raw.sms_fallback_url }),
        ...(raw.sms_method != null && { sms_method: raw.sms_method }),
        ...(raw.sms_status_callback != null && { sms_status_callback: raw.sms_status_callback }),
        ...(raw.sms_url != null && { sms_url: raw.sms_url }),
        ...(raw.status_callback != null && { status_callback: raw.status_callback }),
        ...(raw.status_callback_method != null && { status_callback_method: raw.status_callback_method }),
        ...(raw.uri != null && { uri: raw.uri }),
        ...(raw.voice_caller_id_lookup != null && { voice_caller_id_lookup: raw.voice_caller_id_lookup }),
        ...(raw.voice_fallback_method != null && { voice_fallback_method: raw.voice_fallback_method }),
        ...(raw.voice_fallback_url != null && { voice_fallback_url: raw.voice_fallback_url }),
        ...(raw.voice_method != null && { voice_method: raw.voice_method }),
        ...(raw.voice_url != null && { voice_url: raw.voice_url }),
        ...(raw.public_application_connect_enabled != null && { public_application_connect_enabled: raw.public_application_connect_enabled })
    };
}

function extractPageToken(nextPageUri: string | null | undefined): string | undefined {
    if (!nextPageUri) {
        return undefined;
    }
    const url = new URL(nextPageUri, 'https://api.twilio.com');
    const token = url.searchParams.get('PageToken');
    return token ?? undefined;
}

const action = createAction({
    description: 'List TwiML applications from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-twiml-apps',
        group: 'Applications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            credentials: z
                .object({
                    username: z.string().optional()
                })
                .optional()
        });
        const parsedConnection = connectionSchema.parse(connection);
        const rawAccountSidFromConnection: unknown = parsedConnection.connection_config?.['accountSid'];
        const accountSidFromConnection = typeof rawAccountSidFromConnection === 'string' ? rawAccountSidFromConnection : parsedConnection.credentials?.username;

        const metadata = await nango.getMetadata();
        const metadataSchema = z
            .object({
                account_sid: z.string().optional()
            })
            .optional();
        const parsedMetadata = metadataSchema.parse(metadata);
        const accountSid = accountSidFromConnection || parsedMetadata?.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'missing_account_sid',
                message: 'Could not determine Account SID from the connection or metadata.'
            });
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/usage/api/applications#read-multiple-application-resources
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Applications.json`,
            params: {
                ...(input.friendly_name !== undefined && { FriendlyName: input.friendly_name }),
                ...(input.page_size !== undefined && { PageSize: String(input.page_size) }),
                ...(input.page !== undefined && { Page: String(input.page) }),
                ...(input.cursor !== undefined && { PageToken: input.cursor })
            },
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Twilio API.'
            });
        }

        const providerData = z
            .object({
                applications: z.array(z.unknown()).optional(),
                end: z.number().optional(),
                first_page_uri: z.string().nullable().optional(),
                next_page_uri: z.string().nullable().optional(),
                page: z.number().optional(),
                page_size: z.number().optional(),
                previous_page_uri: z.string().nullable().optional(),
                start: z.number().optional(),
                uri: z.string().nullable().optional()
            })
            .parse(raw);

        const items = (providerData.applications || []).map((app) => {
            const parsed = ProviderAppSchema.parse(app);
            return mapProviderApp(parsed);
        });

        return {
            items,
            next_page_token: extractPageToken(providerData.next_page_uri),
            ...(providerData.page !== undefined && { page: providerData.page }),
            ...(providerData.page_size !== undefined && { page_size: providerData.page_size }),
            ...(providerData.start !== undefined && { start: providerData.start }),
            ...(providerData.end !== undefined && { end: providerData.end })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
