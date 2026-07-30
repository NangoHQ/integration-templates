import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('Record ID. Example: "c3ebdcb3-de93-43da-9067-2191c727d942"')
});

const RecordPropertySchema = z.object({
    type: z.string(),
    value: z.unknown()
});

const ProviderRecordSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        properties: z.record(z.string(), RecordPropertySchema).optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        archived: z.string().nullable().optional(),
        creator: z
            .object({
                id: z.string(),
                type: z.string(),
                email: z.string().optional()
            })
            .optional(),
        editor: z
            .object({
                id: z.string(),
                type: z.string(),
                email: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = ProviderRecordSchema;

const action = createAction({
    description: 'Get a single record by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records.readRecords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/getrecord
            endpoint: `/public/api/v1/records/${encodeURIComponent(input.recordId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found',
                recordId: input.recordId
            });
        }

        const record = ProviderRecordSchema.parse(response.data);
        return record;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
