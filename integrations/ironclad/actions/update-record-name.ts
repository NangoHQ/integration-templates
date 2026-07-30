import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('Record ID. Example: "c3ebdcb3-de93-43da-9067-2191c727d942"'),
    name: z.string().describe('New name for the record.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Rename a record without touching its property values.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developer.ironcladapp.com/reference/patch-record
            endpoint: `/public/api/v1/records/${encodeURIComponent(input.recordId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found or could not be renamed.',
                recordId: input.recordId
            });
        }

        const providerRecord = ProviderRecordSchema.parse(response.data);

        return {
            id: providerRecord.id,
            ...(providerRecord.name != null && { name: providerRecord.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
