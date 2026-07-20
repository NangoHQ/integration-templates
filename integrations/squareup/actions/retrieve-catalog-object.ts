import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object_id: z.string().describe('The object ID of any type of catalog objects to be retrieved. Example: "DJXLBF4XHUSECQ4P6UDOB7KE"')
});

const ProviderResponseSchema = z.object({
    object: z.record(z.string(), z.unknown()).optional(),
    related_objects: z.array(z.record(z.string(), z.unknown())).optional()
});

const OutputSchema = z.object({
    object: z.record(z.string(), z.unknown()).optional(),
    related_objects: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Retrieve a single catalog object by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ITEMS_READ'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/catalog-api/retrieve-catalog-object
            endpoint: `/v2/catalog/object/${encodeURIComponent(input.object_id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            ...(parsed.object !== undefined && { object: parsed.object }),
            ...(parsed.related_objects !== undefined && { related_objects: parsed.related_objects })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
