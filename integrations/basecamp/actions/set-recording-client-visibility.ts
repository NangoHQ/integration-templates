import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_id: z.number().describe('The Basecamp project (bucket) ID containing the recording. Example: 48644099'),
        recording_id: z.number().describe('The unique identifier of the recording whose client visibility will be toggled. Example: 123456789'),
        visible_to_clients: z.boolean().describe('Whether the recording should be visible to clients')
    })
    .describe('Input parameters for toggling the client visibility of a Basecamp recording');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the recording. Example: 123456789'),
        type: z.string().describe('The type of the recording. Example: "Todo", "Message", "Document"'),
        visible_to_clients: z.boolean().describe('Whether the recording is visible to clients'),
        status: z.string().optional().describe('The current status of the recording. Example: "active", "drafted", "trashed"'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the recording was created'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the recording was last updated'),
        url: z.string().optional().describe('API URL for the recording'),
        app_url: z.string().optional().describe('App URL for the recording')
    })
    .passthrough()
    .describe('The updated Basecamp recording after toggling its client visibility');

/**
 * @tags: [write]
 * @tagReason: Updates the client visibility setting on an existing Basecamp recording.
 * @pitfalls: Returns 403 for recordings whose visibility is inherited from a parent (e.g. to-dos from their list, cards from their card table). On projects with clients disabled the call may succeed without changing observable behavior.
 */
const action = createAction({
    description: 'Toggle whether clients can see a recording',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/client_visibility.md
            endpoint: `/buckets/${encodeURIComponent(input.project_id)}/recordings/${encodeURIComponent(input.recording_id)}/client_visibility.json`,
            data: {
                visible_to_clients: input.visible_to_clients
            },
            retries: 3
        });

        const providerRecording = OutputSchema.parse(response.data);

        return providerRecording;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
