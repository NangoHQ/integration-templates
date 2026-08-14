import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        submission_id: z.string().describe('Submission ID. Example: "61109858"'),
        read: z.boolean().optional().describe('Mark the submission as read or unread.'),
        spam: z.boolean().optional().describe('Mark the submission as spam or not spam.'),
        trash: z.boolean().optional().describe('Mark the submission as trashed or not trashed.')
    })
    .refine((data) => data.read !== undefined || data.spam !== undefined || data.trash !== undefined, {
        message: 'At least one of read, spam, or trash must be provided.'
    });

const ProviderSubmissionSchema = z
    .object({
        id: z.number(),
        read: z.boolean().optional(),
        spam: z.boolean().optional(),
        trash: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        read: z.boolean().optional(),
        spam: z.boolean().optional(),
        trash: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Mark a submission as read, spam, and/or trash.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const submissionBody: Record<string, unknown> = {};
        if (input.read !== undefined) {
            submissionBody['read'] = input.read;
        }
        if (input.spam !== undefined) {
            submissionBody['spam'] = input.spam;
        }
        if (input.trash !== undefined) {
            submissionBody['trash'] = input.trash;
        }

        const response = await nango.patch({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `v1/submissions/${encodeURIComponent(input.submission_id)}`,
            data: {
                submission: submissionBody
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Submission not found',
                submission_id: input.submission_id
            });
        }

        const providerSubmission = ProviderSubmissionSchema.parse(response.data);

        return {
            id: providerSubmission.id,
            ...(providerSubmission['read'] !== undefined && { read: providerSubmission['read'] }),
            ...(providerSubmission['spam'] !== undefined && { spam: providerSubmission['spam'] }),
            ...(providerSubmission['trash'] !== undefined && { trash: providerSubmission['trash'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
