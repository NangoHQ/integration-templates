import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sObject: z.string(),
    version: z.string().optional(),
    record: z.record(z.string(), z.unknown())
});

const CreateRecordResponseSchema = z.object({
    id: z.string(),
    success: z.boolean(),
    errors: z.array(z.unknown())
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean(),
    errors: z.array(z.unknown())
});

const action = createAction({
    description: 'Create a Salesforce sObject record for a specified object type.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = input.version || 'v59.0';

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_basic_info_post.htm
        const response = await nango.post({
            endpoint: `/services/data/${encodeURIComponent(apiVersion)}/sobjects/${encodeURIComponent(input.sObject)}/`,
            data: input.record,
            retries: 1
        });

        const parsed = CreateRecordResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Salesforce API',
                details: parsed.error.issues
            });
        }

        const result = parsed.data;

        if (!result.success) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create record',
                errors: result.errors
            });
        }

        return {
            id: result.id,
            success: result.success,
            errors: result.errors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
