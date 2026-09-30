import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SubmissionAnswerSchema = z
    .object({
        name: z.string().optional().describe('Internal field name of the question on the form. Example: "q3_email1"'),
        order: z.string().optional().describe('Display order of the question on the form, as a string. Example: "3"'),
        text: z.string().optional().describe('Label text of the question shown on the form. Example: "Email Address"'),
        type: z.string().optional().describe('Jotform field type of the question. Example: "control_email"'),
        answer: z
            .unknown()
            .optional()
            .describe(
                'Submitted answer. Its shape depends on the field type: a plain string for simple fields, an object of sub-label keys for compound fields, or an array of file URLs for upload fields. Omitted when the question was not answered.'
            )
    })
    .passthrough();

const SubmissionSchema = z
    .object({
        id: z.string().describe('Unique ID of the submission. Example: "6665953126511883799"'),
        form_id: z.string().describe('ID of the form this submission belongs to. Example: "262715780901055"'),
        status: z.string().optional().describe('Status of the submission. Example: "ACTIVE"'),
        new: z.string().optional().describe('"1" when the submission has not been read yet, otherwise "0"'),
        flag: z.string().optional().describe('"1" when the submission is flagged, otherwise "0"'),
        notes: z.string().optional().describe('Notes attached to the submission; an empty string when there are none'),
        ip: z.string().optional().describe('IP address of the submitter. Example: "52.26.211.56"'),
        created_at: z.string().describe('Creation timestamp of the submission. Example: "2026-09-30 12:35:12"'),
        updated_at: z.string().nullable().optional().describe('Timestamp of the last update to the submission; null when it has never been updated'),
        answers: z.record(z.string(), SubmissionAnswerSchema).optional().describe('Answers keyed by the numeric question ID (qid) of each question on the form')
    })
    .passthrough();

const InputSchema = z
    .object({
        form_id: z.string().min(1).describe('ID of the Jotform form whose submissions should be listed. Example: "262715780901055"'),
        cursor: z
            .string()
            .regex(/^[1-9]\d*$/)
            .optional()
            .describe('Pagination cursor returned as next_cursor by a previous call, representing a submission offset. Omit for the first page. Example: "20"'),
        limit: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Maximum number of submissions to return in this page. Falls back to the provider default (20) when omitted. Example: 50'),
        filter: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Jotform filter map applied to submission fields, sent to the API as a JSON-encoded filter parameter. Example: {"created_at:gt": "2026-01-01 00:00:00"}'
            ),
        orderby: z
            .string()
            .optional()
            .describe(
                'Submission field to order results by, with optional direction. Examples: "created_at DESC", "id ASC". Defaults to creation date when omitted'
            )
    })
    .describe('Input for listing the submissions of a Jotform form');

const OutputSchema = z
    .object({
        submissions: z.array(SubmissionSchema).describe('Submissions of the form for the requested page'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Omitted when there are no more results. Example: "40"')
    })
    .describe('A page of form submissions with an optional cursor to the next page');

const ProviderResponseSchema = z.object({
    content: z.array(SubmissionSchema),
    resultSet: z
        .object({
            offset: z.number(),
            limit: z.number(),
            count: z.number()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only performs a read-only GET of a form's submissions from the provider; nothing is created, updated, or deleted.
 * @pitfalls: The answers map contains an entry for every question on the form, including non-input fields like headers, images and submit buttons, and questions with no submitted answer omit the answer field entirely. Answer keys are numeric question IDs (qids) that differ per form rather than field names, so fetch the form's questions to interpret them. Omitting limit returns only the provider default page of 20 submissions, and every full page yields a next_cursor, so the final page may be empty when the total is an exact multiple of the page size.
 */
const action = createAction({
    description: 'List submissions for a specific form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor !== undefined ? parseInt(input.cursor, 10) : 0;

        // https://api.jotform.com/docs/#form-id-submissions
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#form-id-submissions
            endpoint: `/form/${encodeURIComponent(input.form_id)}/submissions`,
            params: {
                offset,
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.filter !== undefined && { filter: JSON.stringify(input.filter) }),
                ...(input.orderby !== undefined && { orderby: input.orderby })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from Jotform.',
                form_id: input.form_id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const resultSet = parsed.resultSet;
        if (resultSet && resultSet.limit > 0 && resultSet.count >= resultSet.limit) {
            next_cursor = String(resultSet.offset + resultSet.count);
        }

        return {
            submissions: parsed.content,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
