import { z } from 'zod';
import { createAction } from 'nango';

const LabelSchema = z.object({
    id: z.number().describe('Label ID. Example: 24774624'),
    name: z.string().describe('Label name. Example: "Confirmed"'),
    color: z.string().describe('Label color. Example: "yellow"')
});

const InputSchema = z.object({});

const OutputSchema = z.array(LabelSchema);

const action = createAction({
    description: 'List appointment labels.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-labels',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.acuityscheduling.com/reference/labels
        const response = await nango.get({
            endpoint: '/labels',
            retries: 3
        });

        const labels = z.array(LabelSchema).parse(response.data);

        return labels;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
