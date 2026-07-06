import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    interviewId: z.string().describe('Interview ID. Example: "32b7bf78-4592-4a56-b313-3e31ed25ea00"'),
    perform_as: z.string().describe('User ID to perform this action on behalf of. Example: "be129d9b-50da-4485-9377-0d83e981f30b"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete an interview from an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['interviews:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#delete-an-interview
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/interviews/${encodeURIComponent(input.interviewId)}`,
            params: {
                perform_as: input.perform_as
            },
            retries: 3
        };

        await nango.delete(config);

        return {
            id: input.interviewId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
