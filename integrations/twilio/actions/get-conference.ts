import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conference_sid: z
        .string()
        .describe('The Twilio-provided string that uniquely identifies the Conference resource. Example: CFaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
});

const MetadataSchema = z.object({
    account_sid: z.string().describe('The Twilio Account SID. Example: ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
});

const OutputSchema = z
    .object({
        account_sid: z.string().optional(),
        api_version: z.string().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        friendly_name: z.string().optional(),
        sid: z.string().optional(),
        region: z.string().optional(),
        status: z.string().optional(),
        subresource_uris: z.record(z.string(), z.string()).optional(),
        uri: z.string().optional(),
        reason_conference_ended: z.string().nullable().optional(),
        call_sid_ending_conference: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single conference from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-conference',
        group: 'Conferences'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);
        const accountSid = metadata.account_sid;

        const response = await nango.get({
            // https://www.twilio.com/docs/voice/api/conference-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences/${encodeURIComponent(input.conference_sid)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conference not found',
                conference_sid: input.conference_sid
            });
        }

        const conference = OutputSchema.parse(response.data);
        return conference;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
