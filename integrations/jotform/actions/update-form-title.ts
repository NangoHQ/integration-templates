import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().min(1).describe('The ID of the Jotform form to rename. Example: "262715780901055"'),
        title: z.string().min(1).describe('The new title to set on the form. Example: "Customer Intake Form"')
    })
    .describe('Input for renaming a Jotform form');

const JotformPropertiesResponseSchema = z.object({
    responseCode: z.number().optional(),
    message: z.string().optional(),
    content: z.object({
        title: z.string(),
        formID: z.coerce.string()
    })
});

const OutputSchema = z
    .object({
        form_id: z.string().describe('The ID of the renamed form. Example: "262715780901055"'),
        title: z.string().describe('The title of the form after the update. Example: "Customer Intake Form"')
    })
    .describe('Result of renaming a Jotform form');

/**
 * @tags: [write]
 * @tagReason: Renames an existing form by setting its title property, a provider-side mutation.
 * @pitfalls: Requires the connection's Jotform API key to have Full Access; a Read Access key still allows reads but fails this call with a 401 "not authorized" error naming the blocked operation.
 */
const action = createAction({
    description: 'Renames an existing form by setting its title property',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Jotform requires the PUT verb on this endpoint; POST on the same path returns 400.
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#put-form-id-properties
            endpoint: `/form/${encodeURIComponent(input.form_id)}/properties`,
            data: {
                properties: {
                    title: input.title
                }
            },
            retries: 3
        };
        const response = await nango.put(config);

        const parsed = JotformPropertiesResponseSchema.parse(response.data);

        return {
            form_id: parsed.content.formID,
            title: parsed.content.title
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
