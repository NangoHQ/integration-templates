import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    segment_id: z.string().describe('Segment ID. Example: "994709ee-75dd-497e-bf46-9f337eaad764"')
});

const ContactSampleSchema = z
    .object({
        contact_id: z.string().optional(),
        email: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional()
    })
    .passthrough();

const ProviderSegmentSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        query_dsl: z.string().optional(),
        contacts_count: z.number().optional(),
        contacts_sample: z.array(ContactSampleSchema).optional(),
        next_sample_update: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single segment by id, including a contact sample.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderSegmentSchema,

    exec: async (nango, input): Promise<z.infer<typeof ProviderSegmentSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/segmenting-contacts-v2/get-segment-by-id
            endpoint: `/v3/marketing/segments/2.0/${encodeURIComponent(input.segment_id)}`,
            retries: 3
        });

        const segment = ProviderSegmentSchema.parse(response.data);
        return segment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
