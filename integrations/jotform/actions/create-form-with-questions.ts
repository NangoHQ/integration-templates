import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const QuestionInputSchema = z.object({
    type: z
        .string()
        .min(1)
        .describe(
            'Jotform field type of the question. Examples: "control_textbox" (short answer), "control_email" (email), "control_fullname" (full name), "control_textarea" (long answer).'
        ),
    text: z.string().min(1).describe('Label of the question shown to respondents. Example: "Your Email"'),
    order: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Display position of the question on the form. Defaults to the question's position in the questions array."),
    name: z.string().optional().describe('Internal field name of the question. Example: "yourEmail"')
});

const InputSchema = z
    .object({
        title: z.string().min(1).describe('Title of the new form. Example: "Customer Feedback Survey"'),
        questions: z.array(QuestionInputSchema).min(1).describe('One or more questions/fields to add to the new form, in display order.')
    })
    .describe('Input for creating a Jotform form with an initial set of questions.');

const QuestionOutputSchema = z.object({
    qid: z.string().describe('Numeric question ID assigned by Jotform. This qid is the answer key used when submitting the form. Example: "3"'),
    type: z.string().describe('Jotform field type of the created question. Example: "control_textbox"'),
    text: z.string().describe('Label of the created question.'),
    name: z.string().optional().describe('Internal field name of the created question, when one was supplied.'),
    order: z.string().optional().describe('Display position of the question on the form.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the newly created form. Example: "262735853167567"'),
        title: z.string().describe('Title of the newly created form.'),
        url: z.string().describe('Public URL of the newly created form. Example: "https://form.jotform.com/262735853167567"'),
        questions: z.array(QuestionOutputSchema).describe('Questions created on the new form, with their Jotform-assigned qids.')
    })
    .describe('The newly created form and its created questions.');

const CreateFormResponseSchema = z.object({
    content: z.object({
        id: z.union([z.string(), z.number()]),
        title: z.string(),
        url: z.string()
    })
});

const AddQuestionsResponseSchema = z.object({
    content: z.array(
        z.object({
            qid: z.union([z.string(), z.number()]),
            type: z.string(),
            text: z.string(),
            name: z.string().optional(),
            order: z.union([z.string(), z.number()]).optional()
        })
    )
});

/**
 * @tags: [write]
 * @tagReason: Creates a new form and adds questions to it; both provider calls mutate the Jotform account.
 * @pitfalls: Jotform auto-assigns each question's numeric qid; callers cannot choose qids and must read them from the output. The operation is not atomic: if adding the questions fails after the form is created, the new form is left behind (empty) and must be deleted separately.
 */
const action = createAction({
    description: 'Create a new form, set its title, and add one or more questions/fields to it in a single call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createFormConfig: ProxyConfiguration = {
            // https://api.jotform.com/docs/#post-form
            endpoint: '/form',
            // Jotform silently drops properties[title] when sent in the request body; it must be sent as a query-string parameter.
            params: {
                'properties[title]': input.title
            },
            // Form creation is not idempotent: a retry after a lost response would create a duplicate form.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries 0 for a non-idempotent create; the rule autofix would silently rewrite this to 10
            retries: 0
        };
        const createResponse = await nango.post(createFormConfig);
        const createdForm = CreateFormResponseSchema.parse(createResponse.data).content;
        const formId = String(createdForm.id);

        const body = new URLSearchParams();
        input.questions.forEach((question, index) => {
            body.set(`questions[${index}][type]`, question.type);
            body.set(`questions[${index}][text]`, question.text);
            body.set(`questions[${index}][order]`, question.order !== undefined ? String(question.order) : String(index + 1));
            if (question.name !== undefined) {
                body.set(`questions[${index}][name]`, question.name);
            }
        });

        const addQuestionsConfig: ProxyConfiguration = {
            // https://api.jotform.com/docs/#put-form-id-questions
            endpoint: `/form/${encodeURIComponent(formId)}/questions`,
            // Jotform requires bracketed form params in a URL-encoded body; axios sends string data with a default 'application/x-www-form-urlencoded' Content-Type.
            // Setting the Content-Type explicitly would make the Nango proxy forward a prefixed override header, which breaks body forwarding for this endpoint.
            data: body.toString(),
            // Adding questions is not idempotent: a retry after a lost response would create duplicate questions on the form.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries 0 for a non-idempotent create; the rule autofix would silently rewrite this to 10
            retries: 0
        };
        const questionsResponse = await nango.put(addQuestionsConfig);
        const createdQuestions = AddQuestionsResponseSchema.parse(questionsResponse.data).content;

        return {
            id: formId,
            title: createdForm.title,
            url: createdForm.url,
            questions: createdQuestions.map((question) => ({
                qid: String(question.qid),
                type: question.type,
                text: question.text,
                ...(question.name !== undefined && { name: question.name }),
                ...(question.order !== undefined && { order: String(question.order) })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
