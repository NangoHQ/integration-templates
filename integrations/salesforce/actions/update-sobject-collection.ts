import { z } from 'zod';
import { createAction } from 'nango';

const RecordUpdateSchema = z.object({
    attributes: z.object({
        type: z.string().describe('The sObject type. Example: "Account", "Contact"')
    }),
    id: z.string().describe('The record ID to update. Example: "001xx000003DHP0AAO"')
});

const InputSchema = z.object({
    records: z
        .array(RecordUpdateSchema.passthrough())
        .describe('Array of records to update. Each record must include attributes.type, id, and the fields to update.'),
    allOrNone: z.boolean().optional().describe('If true, all records must succeed or all fail. If false, partial success is allowed. Default: false')
});

const SubresultSchema = z.object({
    id: z.string().optional(),
    success: z.boolean(),
    errors: z
        .array(
            z.object({
                statusCode: z.string(),
                message: z.string(),
                fields: z.array(z.string()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    results: z.array(SubresultSchema)
});

const action = createAction({
    description: 'Update multiple records in one sObject collection request',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-sobject-collection',
        group: 'sObject Collections'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const records = input.records.map((record) => {
            const { attributes, id, ...rest } = record;
            return {
                attributes,
                id,
                ...rest
            };
        });

        const response = await nango.patch({
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections.htm
            endpoint: '/services/data/v59.0/composite/sobjects',
            data: {
                records: records,
                allOrNone: input.allOrNone ?? false
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'No response data received from Salesforce'
            });
        }

        const results = z.array(SubresultSchema).parse(response.data);

        return {
            results: results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
