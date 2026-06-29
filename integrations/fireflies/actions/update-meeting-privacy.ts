import { z } from 'zod';
import { createAction } from 'nango';

const PrivacyEnum = z.enum(['link', 'owner', 'participants', 'participatingteammates', 'teammatesandparticipants', 'teammates']);

const InputSchema = z.object({
    id: z.string().describe('Transcript ID. Example: "abc123"'),
    privacy: PrivacyEnum.describe('Privacy setting. Example: "teammates"')
});

const OutputSchema = z.boolean();

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            updateMeetingPrivacy: z.object({
                id: z.string(),
                privacy: PrivacyEnum
            })
        })
        .nullable()
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Update the privacy setting of a meeting transcript.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/transcript
            endpoint: '/graphql',
            data: {
                query: `
                    mutation UpdateMeetingPrivacy($input: UpdateMeetingPrivacyInput!) {
                        updateMeetingPrivacy(input: $input) {
                            id
                            privacy
                        }
                    }
                `,
                variables: {
                    input: {
                        id: input.id,
                        privacy: input.privacy
                    }
                }
            },
            retries: 10
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors occurred during updateMeetingPrivacy.',
                errors: parsed.errors
            });
        }

        if (!parsed.data?.updateMeetingPrivacy) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing updateMeetingPrivacy in response.'
            });
        }

        return true;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
