import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    beta: z.boolean().optional().describe('Whether to include phone numbers new to the Twilio platform. Defaults to true.'),
    friendlyName: z.string().optional().describe('A string that identifies the IncomingPhoneNumber resources to read.'),
    phoneNumber: z.string().optional().describe('The phone numbers to read. You can specify partial numbers and use * as a wildcard.'),
    origin: z.enum(['twilio', 'hosted']).optional().describe('Whether to include phone numbers based on their origin.'),
    pageSize: z.number().int().min(1).max(1000).optional().describe('How many resources to return in each list page. Default is 50, maximum is 1000.'),
    page: z.number().int().min(0).optional().describe('The page index. This value is simply for client state.'),
    cursor: z.string().optional().describe('The page token from the previous response. This is provided by the API in the next_page_uri field.')
});

const ConnectionSchema = z
    .object({
        credentials: z
            .object({
                username: z.string()
            })
            .optional()
    })
    .passthrough();

const MetadataSchema = z
    .object({
        account_sid: z.string().optional()
    })
    .passthrough();

const CapabilitySchema = z.object({
    voice: z.boolean().optional(),
    sms: z.boolean().optional(),
    mms: z.boolean().optional(),
    fax: z.boolean().optional()
});

const IncomingPhoneNumberSchema = z
    .object({
        account_sid: z.string().optional(),
        address_requirements: z.string().optional(),
        address_sid: z.string().optional(),
        api_version: z.string().optional(),
        beta: z.boolean().nullable().optional(),
        capabilities: CapabilitySchema.optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        emergency_status: z.string().optional(),
        emergency_address_sid: z.string().optional(),
        emergency_address_status: z.string().optional(),
        friendly_name: z.string().optional(),
        identity_sid: z.string().optional(),
        origin: z.string().optional(),
        phone_number: z.string().optional(),
        sid: z.string(),
        sms_application_sid: z.string().optional(),
        sms_fallback_method: z.string().optional(),
        sms_fallback_url: z.string().optional(),
        sms_method: z.string().optional(),
        sms_url: z.string().optional(),
        status_callback: z.string().optional(),
        status_callback_method: z.string().optional(),
        trunk_sid: z.string().nullable().optional(),
        uri: z.string().optional(),
        voice_application_sid: z.string().optional(),
        voice_caller_id_lookup: z.boolean().optional(),
        voice_fallback_method: z.string().optional(),
        voice_fallback_url: z.string().nullable().optional(),
        voice_method: z.string().optional(),
        voice_url: z.string().nullable().optional(),
        bundle_sid: z.string().optional(),
        voice_receive_mode: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const ListResponseSchema = z.object({
    incoming_phone_numbers: z.array(IncomingPhoneNumberSchema).optional(),
    first_page_uri: z.string().nullable().optional(),
    next_page_uri: z.string().nullable().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
    previous_page_uri: z.string().nullable().optional(),
    start: z.number().optional(),
    end: z.number().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(IncomingPhoneNumberSchema),
    next_page_uri: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional()
});

const action = createAction({
    description: 'List incoming phone numbers from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();

        const parsedConnection = ConnectionSchema.safeParse(connection);
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        const accountSid = parsedConnection.data?.credentials?.username || parsedMetadata.data?.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'missing_account_sid',
                message: 'Account SID not found in connection credentials or metadata.'
            });
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource#read-multiple-incomingphonenumber-resources
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/IncomingPhoneNumbers.json`,
            params: {
                ...(input.beta !== undefined && { Beta: input.beta.toString() }),
                ...(input.friendlyName !== undefined && { FriendlyName: input.friendlyName }),
                ...(input.phoneNumber !== undefined && { PhoneNumber: input.phoneNumber }),
                ...(input.origin !== undefined && { Origin: input.origin }),
                ...(input.pageSize !== undefined && { PageSize: input.pageSize.toString() }),
                ...(input.page !== undefined && { Page: input.page.toString() }),
                ...(input.cursor !== undefined && { PageToken: input.cursor })
            },
            retries: 3
        });

        const data = ListResponseSchema.parse(response.data);
        const items = data.incoming_phone_numbers ?? [];

        return {
            items,
            ...(data.next_page_uri != null && { next_page_uri: data.next_page_uri }),
            ...(data.page !== undefined && { page: data.page }),
            ...(data.page_size !== undefined && { page_size: data.page_size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
