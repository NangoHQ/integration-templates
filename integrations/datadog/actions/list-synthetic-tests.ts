import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const SyntheticTestSchema = z
    .object({
        public_id: z.string().describe('Synthetic test public ID. Example: "abc-123-def"'),
        name: z.string().describe('Name of the synthetic test.'),
        status: z.string().describe('Status of the synthetic test. Example: "live" or "paused".'),
        type: z.string().describe('Type of the synthetic test. Example: "api" or "browser".')
    })
    .passthrough();

const OutputSchema = z.object({
    tests: z.array(SyntheticTestSchema).describe('List of synthetic tests.')
});

const action = createAction({
    description: 'List Synthetic API/browser/mobile tests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['synthetics_read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/synthetics/#get-the-list-of-all-tests
            endpoint: 'v1/synthetics/tests',
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Datadog API'
            });
        }

        const parsed = z
            .object({
                tests: z.array(z.unknown())
            })
            .parse(response.data);

        const tests = parsed.tests.map((test) => {
            const parsedTest = SyntheticTestSchema.parse(test);
            return parsedTest;
        });

        return {
            tests
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
