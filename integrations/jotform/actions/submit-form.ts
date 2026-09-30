import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const AnswerSchema = z.object({
    qid: z.string().describe('Numeric question ID (qid) of the question being answered, as returned by the form\'s questions list. Example: "3"'),
    value: z
        .union([z.string(), z.record(z.string(), z.string())])
        .describe(
            'Answer for the question: a plain string for a simple field (e.g. "jane@example.com" for an email field), or an object of sub-values keyed by the question\'s sublabel keys for a compound field (e.g. { "first": "Jane", "last": "Doe" } for a full name field).'
        )
});

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the Jotform form to submit. Example: "262715780901055"'),
        answers: z
            .array(AnswerSchema)
            .min(1)
            .describe(
                "One or more answers keyed by question qid. Use the list-form-questions action first to discover each question's qid, field type, and sublabel keys."
            )
    })
    .describe('Input for submitting a Jotform form: the form ID and one or more answers keyed by numeric question ID (qid).');

const ProviderSubmissionContentSchema = z.object({
    submissionID: z.string(),
    URL: z.string()
});

const OutputSchema = z
    .object({
        submission_id: z.string().describe('ID of the created submission. Example: "6665948653814244880"'),
        url: z.string().describe('API URL of the created submission resource. Example: "https://api.jotform.com/submission/6665948653814244880"')
    })
    .describe('Output of a submitted Jotform form: the created submission ID and its API URL, without the recorded answers.');

/**
 * @tags: [write]
 * @tagReason: Creates a new submission on the given Jotform form.
 * @pitfalls: Answers are keyed by per-form numeric question IDs (not stable field names) and compound fields require sub-keys matching that question's sublabels (e.g. first/last); discover both from the form's questions first. A submission still succeeds when an answer key matches no question, with unmatched answers silently dropped or misplaced. The response returns only the new submission's ID and URL, not the recorded answers; call get-submission to read them back. Submitting requires a Full Access Jotform API key; Read Access keys fail writes with a 401 naming the blocked operation.
 */
const action = createAction({
    description: 'Submit a form (create a new submission) with answers for one or more of its questions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const submissionParams: Record<string, string> = {};
        for (const answer of input.answers) {
            if (typeof answer.value === 'string') {
                submissionParams[`submission[${answer.qid}]`] = answer.value;
            } else {
                for (const [subKey, subValue] of Object.entries(answer.value)) {
                    submissionParams[`submission[${answer.qid}][${subKey}]`] = subValue;
                }
            }
        }

        // Jotform mis-maps answers whose `submission[...]` keys arrive in a urlencoded POST body
        // (percent-encoded brackets), so the params are sent in the query string, which Jotform
        // parses correctly.
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs#form-id-submissions
            endpoint: `/form/${encodeURIComponent(input.form_id)}/submissions`,
            params: submissionParams,
            // Creating a submission is not idempotent and Jotform offers no idempotency key, so a retry after a lost response would create a duplicate submission.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- 0 is deliberate for this non-idempotent create
            retries: 0
        };

        const response = await nango.post(config);
        const content = ProviderSubmissionContentSchema.parse(response.data?.content);

        return {
            submission_id: content.submissionID,
            url: content.URL
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
