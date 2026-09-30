import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the Jotform form whose questions to list. Example: "262715780901055"')
    })
    .describe('Input for listing the questions of a Jotform form');

const SublabelsSchema = z.record(z.string(), z.string());

const QuestionSchema = z.object({
    qid: z.string().describe('Numeric question ID as a string. This is the key used to submit answers for this question. Example: "3"'),
    type: z.string().describe('Jotform field type of the question. Example: "control_email"'),
    name: z.string().describe('Unique field name of the question within the form. Example: "email"'),
    text: z.string().optional().describe('Label text shown to the respondent for this question. Example: "Your Email"'),
    order: z.number().optional().describe('Display position of the question on the form, starting from 1. Example: 2'),
    sublabels: SublabelsSchema.optional().describe(
        'Sub-answer keys and their labels for compound field types such as control_fullname. Example: {"first": "First Name", "last": "Last Name"}'
    )
});

const OutputSchema = z
    .object({
        questions: z.array(QuestionSchema).describe('All questions of the form, sorted by their display order')
    })
    .describe('List of the questions of the form');

const ProviderQuestionSchema = z.object({
    type: z.string(),
    name: z.string(),
    text: z.string().optional(),
    order: z.union([z.string(), z.number()]).optional(),
    sublabels: z.union([z.string(), SublabelsSchema]).optional()
});

const ProviderResponseSchema = z.object({
    // An empty question set comes back as an empty array instead of an object keyed by qid
    content: z.union([z.record(z.string(), ProviderQuestionSchema), z.array(z.unknown())]).transform((content) => (Array.isArray(content) ? {} : content))
});

function toOrder(raw: string | number | undefined): number | undefined {
    if (raw === undefined) {
        return undefined;
    }
    const value = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : undefined;
}

function parseSublabels(raw: string | Record<string, string> | undefined): Record<string, string> | undefined {
    if (raw === undefined) {
        return undefined;
    }
    if (typeof raw !== 'string') {
        return raw;
    }
    if (raw === '') {
        return undefined;
    }
    // @allowTryCatch: sublabels may come back as a provider-supplied JSON-encoded string; omit it rather than fail the whole action when it is malformed
    try {
        const parsed = SublabelsSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : undefined;
    } catch {
        return undefined;
    }
}

/**
 * @tags: [read]
 * @tagReason: Only performs a GET request to fetch the questions of a form and never modifies any provider data.
 * @pitfalls: The result also lists non-answerable layout and widget fields such as headers, images, captcha, and payment fields alongside real questions. On compound fields, sublabels can contain entries that are not submittable answer keys, such as validation messages.
 */
const action = createAction({
    description: 'List the questions/fields of a form, including the numeric ID (qid), type, and field name of each question.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/ (GET /form/{formID}/questions)
        const response = await nango.get({
            endpoint: `/form/${encodeURIComponent(input.form_id)}/questions`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const questions = Object.entries(parsed.content).map(([qid, question]) => {
            const order = toOrder(question.order);
            const sublabels = parseSublabels(question.sublabels);
            return {
                qid,
                type: question.type,
                name: question.name,
                ...(question.text !== undefined && { text: question.text }),
                ...(order !== undefined && { order }),
                ...(sublabels !== undefined && { sublabels })
            };
        });

        questions.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

        return { questions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
