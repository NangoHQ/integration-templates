import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    allOrNone: z
        .boolean()
        .optional()
        .describe('Indicates whether to roll back the entire request when any object fails (true) or continue with other objects (false). Defaults to false.'),
    records: z
        .array(
            z
                .object({
                    attributes: z.object({
                        type: z.string().describe('The sObject type for this record. Example: "Account", "Contact", "Opportunity"')
                    })
                })
                .passthrough()
                .describe('An sObject record. Must include attributes.type. Additional fields depend on the sObject type.')
        )
        .describe('List of sObject records to create. Up to 200 records.'),
    apiVersion: z.string().optional().describe('API version to use (e.g., "v63.0"). If not provided, uses the connection default.')
});

const SaveResultSchema = z.object({
    id: z.string().optional().describe('The ID of the created record, if successful.'),
    success: z.boolean().describe('Whether the record was created successfully.'),
    errors: z
        .array(
            z.object({
                statusCode: z.string().describe('Error status code.'),
                message: z.string().describe('Error message.'),
                fields: z.array(z.string()).optional().describe('Fields that caused the error.')
            })
        )
        .optional()
        .describe('List of errors if the record creation failed.')
});

const OutputSchema = z.object({
    results: z.array(SaveResultSchema).describe('List of SaveResult objects corresponding to each input record, in the same order.')
});

const action = createAction({
    description: 'Create multiple sObject records in one collection request.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = input.apiVersion || 'v63.0';

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_create.htm
        const response = await nango.post({
            endpoint: `/services/data/${encodeURIComponent(apiVersion)}/composite/sobjects`,
            data: {
                allOrNone: input.allOrNone,
                records: input.records
            },
            retries: 3
        });

        const rawResults = z.array(z.unknown()).parse(response.data);

        const results = rawResults.map((item) => {
            const result = SaveResultSchema.parse(item);
            return {
                ...(result.id !== undefined && { id: result.id }),
                success: result.success,
                ...(result.errors !== undefined && { errors: result.errors })
            };
        });

        return { results };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
