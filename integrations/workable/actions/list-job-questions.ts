import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('The job shortcode. Example: "9CD658E13E"')
});

const QuestionChoiceSchema = z.object({
    id: z.string(),
    body: z.string()
});

const QuestionSchema = z.object({
    id: z.string(),
    body: z.string(),
    type: z.string().describe('Question type. Example: "free_text", "multiple_choice", "boolean", "dropdown", "numeric", "date", "file", "short_text"'),
    required: z.boolean(),
    single_answer: z.boolean().optional(),
    choices: z.array(QuestionChoiceSchema).optional(),
    supported_file_types: z.array(z.string()).optional(),
    max_file_size: z.number().optional()
});

const OutputSchema = z.object({
    questions: z.array(QuestionSchema)
});

const action = createAction({
    description: "List a job's application questions",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/job-questions
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/questions`,
            retries: 3
        });

        if (response.status === 404 || !response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Job not found or no questions available',
                shortcode: input.shortcode
            });
        }

        const rawQuestions = z
            .object({
                questions: z.unknown().array().optional()
            })
            .parse(response.data).questions;

        if (!rawQuestions) {
            return { questions: [] };
        }

        const questions = rawQuestions.map((item: unknown) => QuestionSchema.parse(item));

        return {
            questions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
