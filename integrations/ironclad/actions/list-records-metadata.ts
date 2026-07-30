import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const PropertySchema = z.object({
    type: z.string(),
    displayName: z.string(),
    group: z.string().optional()
});

const RecordTypeSchema = z
    .object({
        displayName: z.string(),
        description: z.string().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    properties: z.record(z.string(), PropertySchema),
    recordTypes: z.record(z.string(), RecordTypeSchema)
});

const OutputSchema = z.object({
    properties: z.record(z.string(), PropertySchema),
    recordTypes: z.record(z.string(), RecordTypeSchema)
});

const action = createAction({
    description: 'Get the full schema of record types and properties configured in this tenant.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/list-record-metadata
            endpoint: '/public/api/v1/records/metadata',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            properties: providerData.properties,
            recordTypes: providerData.recordTypes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
