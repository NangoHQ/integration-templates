import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('The job shortcode. Example: "9CD658E13E"')
});

const FormFieldSchema = z
    .object({
        key: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.boolean(),
        single_answer: z.boolean().optional(),
        max_length: z.number().optional(),
        accepted_file_types: z.array(z.string()).optional(),
        options: z.array(z.unknown()).optional()
    })
    .passthrough();

const QuestionSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        body: z.string(),
        type: z.string(),
        required: z.boolean(),
        options: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    form_fields: z.array(FormFieldSchema),
    questions: z.array(QuestionSchema)
});

const action = createAction({
    description: 'Retrieve the structured application-form field definitions for a job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/jobsshortcodeapplication_form
        const response = await nango.get({
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/application_form`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
