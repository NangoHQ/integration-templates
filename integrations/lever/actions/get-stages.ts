import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const LeverStageSchema = z.object({
    id: z.string(),
    text: z.string()
});

const GetStagesOutputSchema = z.object({
    stages: z.array(LeverStageSchema)
});

const action = createAction({
    description:
        'Action to get lists all pipeline stages. Note that this does \nnot paginate the response so it is possible that not all stages \nare returned.',
    version: '3.0.0',
    input: z.object({}),
    output: GetStagesOutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof GetStagesOutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-stages
            endpoint: '/v1/stages',
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = z
            .object({
                data: z.array(LeverStageSchema)
            })
            .parse(response.data);

        return {
            stages: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
