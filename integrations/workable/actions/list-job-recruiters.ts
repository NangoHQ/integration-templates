import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('The job shortcode. Example: "9CD658E13E"')
});

const RecruiterSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
});

const OutputSchema = z.object({
    recruiters: z.array(RecruiterSchema)
});

const action = createAction({
    description: 'List external recruiters collaborating on a specific job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/new-jobsshortcoderecruiters
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/recruiters`,
            retries: 3
        });

        const body = response.data;

        if (body === null || typeof body !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Workable API.'
            });
        }

        const recruitersArray = Array.isArray(body) ? body : 'recruiters' in body && Array.isArray(body.recruiters) ? body.recruiters : null;

        if (recruitersArray === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Could not find recruiters array in response.'
            });
        }

        const recruiters = recruitersArray.map((item: unknown) => {
            const parsed = RecruiterSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid recruiter item in response.'
                });
            }
            return parsed.data;
        });

        return {
            recruiters
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
