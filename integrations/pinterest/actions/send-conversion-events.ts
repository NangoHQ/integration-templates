import { createHash } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const UserDataSchema = z
    .object({
        em: z.array(z.string()).optional().describe('Raw email addresses to be lowercased and SHA-256 hashed before sending.'),
        ph: z.array(z.string()).optional().describe('Raw phone numbers to be lowercased and SHA-256 hashed before sending.')
    })
    .passthrough();

const EventSchema = z
    .object({
        event_name: z.string().describe('Event name. Example: "checkout"'),
        action_source: z.string().describe('Action source. Example: "web"'),
        event_time: z.number().describe('Event time in Unix seconds. Example: 1699999999'),
        event_id: z.string().describe('Unique event ID. Example: "event-123"'),
        user_data: UserDataSchema.describe('User data. Required. Emails and phones will be lowercased and SHA-256 hashed.')
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    data: z.array(EventSchema).describe('Array of conversion events.')
});

const ProviderResponseSchema = z.object({
    num_events_received: z.number(),
    num_events_processed: z.number()
});

const OutputSchema = z.object({
    num_events_received: z.number(),
    num_events_processed: z.number()
});

function sha256Hash(value: string): string {
    return createHash('sha256').update(value.toLowerCase()).digest('hex');
}

function hashUserData(userData: z.infer<typeof UserDataSchema>): z.infer<typeof UserDataSchema> {
    const result: z.infer<typeof UserDataSchema> = { ...userData };

    if (Array.isArray(result.em)) {
        result.em = result.em.map((email) => {
            if (typeof email === 'string') {
                return sha256Hash(email);
            }
            return email;
        });
    }

    if (Array.isArray(result.ph)) {
        result.ph = result.ph.map((phone) => {
            if (typeof phone === 'string') {
                return sha256Hash(phone);
            }
            return phone;
        });
    }

    return result;
}

const action = createAction({
    description: 'Send server-side conversion events (Conversions API).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = {
            data: input.data.map((event) => ({
                ...event,
                user_data: hashUserData(event.user_data)
            }))
        };

        // https://developers.pinterest.com/docs/api/v5/#operation/events_create
        const response = await nango.post({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/events`,
            data: payload,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            num_events_received: providerResponse.num_events_received,
            num_events_processed: providerResponse.num_events_processed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
