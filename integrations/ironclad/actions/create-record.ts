import { z } from 'zod';
import { createAction } from 'nango';

const PropertyValueSchema = z.object({
    type: z.string(),
    value: z.unknown()
});

const InputSchema = z.object({
    type: z.string().describe('Record type key. Example: "everyFieldType"'),
    name: z.string().describe('Record name'),
    properties: z.record(z.string(), PropertyValueSchema).optional().describe('Record property values keyed by property key, each wrapped with type and value')
});

const ProviderPropertyValueSchema = z
    .object({
        type: z.string(),
        value: z.unknown()
    })
    .passthrough();

const ProviderRecordSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
        properties: z.record(z.string(), ProviderPropertyValueSchema).optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    properties: z.record(z.string(), ProviderPropertyValueSchema).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a new standalone record',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records.createRecords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ironcladapp.com/
            endpoint: '/public/api/v1/records',
            data: {
                type: input.type,
                name: input.name,
                ...(input.properties !== undefined && { properties: input.properties })
            },
            retries: 1
        });

        const providerRecord = ProviderRecordSchema.parse(response.data);

        return {
            id: providerRecord.id,
            ...(providerRecord.name != null && { name: providerRecord.name }),
            ...(providerRecord.type != null && { type: providerRecord.type }),
            ...(providerRecord.properties != null && { properties: providerRecord.properties }),
            ...(providerRecord.createdAt != null && { createdAt: providerRecord.createdAt }),
            ...(providerRecord.updatedAt != null && { updatedAt: providerRecord.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
