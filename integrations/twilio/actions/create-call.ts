import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account_sid: z.string().describe('The SID of the Account that will create the resource. Example: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'),
    to: z.string().describe('The phone number, SIP address, or client identifier to call. Example: "+18777804236"'),
    from: z.string().describe('The Twilio phone number or client identifier to use as the caller ID. Example: "+19843341706"'),
    url: z.string().optional().describe('The absolute URL that returns TwiML instructions for the call.'),
    twiml: z.string().optional().describe('TwiML instructions for the call. Max 4000 characters.'),
    application_sid: z.string().optional().describe('The SID of the Application resource that will handle the call.'),
    method: z.enum(['GET', 'POST']).optional().describe('The HTTP method to use when calling the url parameter.'),
    fallback_url: z.string().optional().describe('The URL to call if an error occurs when requesting or executing the TwiML at url.'),
    fallback_method: z.enum(['GET', 'POST']).optional().describe('The HTTP method to use for the fallback_url.'),
    status_callback: z.string().optional().describe('The URL to call to send status information.'),
    status_callback_event: z.array(z.string()).optional().describe('The call progress events to send to the status_callback URL.'),
    status_callback_method: z.enum(['GET', 'POST']).optional().describe('The HTTP method to use when calling the status_callback URL.'),
    send_digits: z.string().optional().describe('The string of keys to dial after connecting, max 32 digits.'),
    timeout: z.number().optional().describe('The number of seconds to allow the phone to ring before assuming no answer. Default 60, max 600.'),
    record: z.boolean().optional().describe('Whether to record the call.'),
    recording_channels: z.string().optional().describe('The number of channels in the final recording. Can be mono or dual.'),
    recording_status_callback: z.string().optional().describe('The URL to call when the recording is available.'),
    recording_status_callback_method: z.enum(['GET', 'POST']).optional().describe('The HTTP method for the recording_status_callback URL.'),
    machine_detection: z.string().optional().describe('Whether to detect human, answering machine, or fax. Can be Enable or DetectMessageEnd.'),
    machine_detection_timeout: z.number().optional().describe('Seconds to attempt answering machine detection before timing out. Default 30.'),
    trim: z.string().optional().describe('Whether to trim leading and trailing silence. Can be trim-silence or do-not-trim.'),
    caller_id: z.string().optional().describe('The phone number, SIP address, or Client identifier that made this call.'),
    recording_track: z.string().optional().describe('The audio track to record. Can be inbound, outbound, or both.'),
    time_limit: z.number().optional().describe('The maximum duration of the call in seconds.')
});

const CallSchema = z.object({
    account_sid: z.string(),
    annotation: z.string().nullable().optional(),
    answered_by: z.string().nullable().optional(),
    api_version: z.string(),
    caller_name: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    direction: z.string(),
    duration: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    forwarded_from: z.string().nullable().optional(),
    from: z.string(),
    from_formatted: z.string(),
    group_sid: z.string().nullable().optional(),
    parent_call_sid: z.string().nullable().optional(),
    phone_number_sid: z.string(),
    price: z.string().nullable().optional(),
    price_unit: z.string(),
    queue_time: z.string().nullable().optional(),
    sid: z.string(),
    start_time: z.string().nullable().optional(),
    status: z.string(),
    subresource_uris: z.record(z.string(), z.string()),
    to: z.string(),
    to_formatted: z.string(),
    trunk_sid: z.string().nullable().optional(),
    uri: z.string()
});

const OutputSchema = z.object({
    call: CallSchema
});

const action = createAction({
    description: 'Create a call in Twilio',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-call',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();

        body.append('To', input.to);
        body.append('From', input.from);

        if (input.url !== undefined) {
            body.append('Url', input.url);
        }
        if (input.twiml !== undefined) {
            body.append('Twiml', input.twiml);
        }
        if (input.application_sid !== undefined) {
            body.append('ApplicationSid', input.application_sid);
        }
        if (input.method !== undefined) {
            body.append('Method', input.method);
        }
        if (input.fallback_url !== undefined) {
            body.append('FallbackUrl', input.fallback_url);
        }
        if (input.fallback_method !== undefined) {
            body.append('FallbackMethod', input.fallback_method);
        }
        if (input.status_callback !== undefined) {
            body.append('StatusCallback', input.status_callback);
        }
        if (input.status_callback_event !== undefined) {
            for (const event of input.status_callback_event) {
                body.append('StatusCallbackEvent', event);
            }
        }
        if (input.status_callback_method !== undefined) {
            body.append('StatusCallbackMethod', input.status_callback_method);
        }
        if (input.send_digits !== undefined) {
            body.append('SendDigits', input.send_digits);
        }
        if (input.timeout !== undefined) {
            body.append('Timeout', input.timeout.toString());
        }
        if (input.record !== undefined) {
            body.append('Record', input.record.toString());
        }
        if (input.recording_channels !== undefined) {
            body.append('RecordingChannels', input.recording_channels);
        }
        if (input.recording_status_callback !== undefined) {
            body.append('RecordingStatusCallback', input.recording_status_callback);
        }
        if (input.recording_status_callback_method !== undefined) {
            body.append('RecordingStatusCallbackMethod', input.recording_status_callback_method);
        }
        if (input.machine_detection !== undefined) {
            body.append('MachineDetection', input.machine_detection);
        }
        if (input.machine_detection_timeout !== undefined) {
            body.append('MachineDetectionTimeout', input.machine_detection_timeout.toString());
        }
        if (input.trim !== undefined) {
            body.append('Trim', input.trim);
        }
        if (input.caller_id !== undefined) {
            body.append('CallerId', input.caller_id);
        }
        if (input.recording_track !== undefined) {
            body.append('RecordingTrack', input.recording_track);
        }
        if (input.time_limit !== undefined) {
            body.append('TimeLimit', input.time_limit.toString());
        }

        // https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource
        const response = await nango.post({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(input.account_sid)}/Calls.json`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Twilio returned an empty or invalid response when creating the call.'
            });
        }

        const parsedData = CallSchema.safeParse(response.data);
        if (!parsedData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Twilio returned a response that does not match the expected call schema.',
                errors: parsedData.error.issues
            });
        }

        return {
            call: parsedData.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
