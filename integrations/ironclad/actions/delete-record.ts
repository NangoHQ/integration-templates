import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('The ID of the record to delete. Example: "c3ebdcb3-de93-43da-9067-2191c727d942"')
});

const OutputSchema = z.object({
    success: z.literal(true),
    recordId: z.string()
});

const action = createAction({
    description: 'Delete a record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records.deleteRecords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/records/${encodeURIComponent(input.recordId)}`,
            retries: 10
        });

        return {
            success: true,
            recordId: input.recordId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
