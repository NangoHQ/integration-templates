import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('Scenario ID. Example: 6413021')
});

const UsageEntrySchema = z.object({
    date: z.string(),
    operations: z.number(),
    centicredits: z.number(),
    dataTransfer: z.number()
});

const OutputSchema = z.object({
    data: z.array(UsageEntrySchema)
});

const action = createAction({
    description: 'Retrieve operations and data-transfer usage for a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/scenarios-get-scenario-usage
            endpoint: `/scenarios/${encodeURIComponent(input.scenarioId)}/usage`,
            retries: 3
        });

        const payload = response.data;
        if (!payload || typeof payload !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Make API.'
            });
        }

        if (!('data' in payload)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response missing expected "data" field.'
            });
        }

        const data = payload.data;
        if (!Array.isArray(data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected "data" to be an array.'
            });
        }

        const parsedEntries = data.map((entry: unknown) => {
            if (!entry || typeof entry !== 'object') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Each usage entry must be an object.'
                });
            }

            const entryObj: { date?: unknown; operations?: unknown; centicredits?: unknown; dataTransfer?: unknown } = entry;

            if (
                typeof entryObj.date !== 'string' ||
                typeof entryObj.operations !== 'number' ||
                typeof entryObj.centicredits !== 'number' ||
                typeof entryObj.dataTransfer !== 'number'
            ) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Usage entry has unexpected shape.'
                });
            }

            return {
                date: entryObj.date,
                operations: entryObj.operations,
                centicredits: entryObj.centicredits,
                dataTransfer: entryObj.dataTransfer
            };
        });

        return { data: parsedEntries };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
