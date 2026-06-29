import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    transcript_ids: z
        .array(z.string().min(1))
        .min(1)
        .max(5)
        .describe('Array of Transcript IDs to update. Must contain 1–5 items. Example: ["transcript_id_1"]'),
    channel_id: z.string().min(1).describe('The target Channel ID. Example: "channel_id"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            updateMeetingChannel: z
                .array(
                    z.object({
                        id: z.string(),
                        title: z.string().nullable().optional(),
                        channels: z
                            .array(
                                z.object({
                                    id: z.string()
                                })
                            )
                            .nullable()
                            .optional()
                    })
                )
                .nullable()
                .optional()
        })
        .nullish(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                code: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.boolean();

const action = createAction({
    description: 'Assign transcripts to a channel',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/mutation/update-meeting-channel
            endpoint: 'graphql',
            data: {
                query: 'mutation($input: UpdateMeetingChannelInput!) { updateMeetingChannel(input: $input) { id title channels { id } } }',
                variables: {
                    input: {
                        transcript_ids: input.transcript_ids,
                        channel_id: input.channel_id
                    }
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response from Fireflies API'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join(', ')
            });
        }

        if (!parsed.data?.updateMeetingChannel || parsed.data.updateMeetingChannel.length === 0) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update meeting channel'
            });
        }

        return true;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
