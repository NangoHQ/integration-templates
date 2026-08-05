import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(1000).optional().describe('Number of tests to return per page. Defaults to 100.')
});

const SyntheticTestSchema = z
    .object({
        public_id: z.string().describe('Synthetic test public ID. Example: "abc-123-def"'),
        name: z.string().describe('Name of the synthetic test.'),
        status: z.string().describe('Status of the synthetic test. Example: "live" or "paused".'),
        type: z.string().describe('Type of the synthetic test. Example: "api" or "browser".')
    })
    .passthrough();

const OutputSchema = z.object({
    tests: z.array(SyntheticTestSchema).describe('List of synthetic tests.'),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Synthetic API/browser/mobile tests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['synthetics_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer page number'
            });
        }
        const pageNumber = input.cursor ? parseInt(input.cursor, 10) : 0;
        const pageSize = input.page_size ?? 100;

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/synthetics/#get-the-list-of-all-tests
            endpoint: 'v1/synthetics/tests',
            params: {
                page_size: String(pageSize),
                page_number: String(pageNumber)
            },
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

        const nextCursor = tests.length === pageSize ? String(pageNumber + 1) : undefined;

        return {
            tests,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
