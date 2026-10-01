import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SubmissionAnswerSchema = z
    .object({
        name: z.string().optional().describe('Internal field name of the question (e.g. "q3_email1")'),
        order: z.string().optional().describe('Display order of the question on the form, as a string (e.g. "3")'),
        text: z.string().optional().describe('Label of the question as shown on the form (e.g. "Email Address")'),
        type: z.string().optional().describe('Jotform field type of the question (e.g. "control_email", "control_fullname")'),
        sublabels: z
            .string()
            .optional()
            .describe('JSON-encoded map of sub-labels for compound field types such as control_fullname (e.g. {"first": "First Name", "last": "Last Name"})'),
        selectedField: z.string().optional().describe('Selected sub-field identifier for question types that expose one (e.g. control_autoincrement)'),
        answer: z
            .unknown()
            .optional()
            .describe(
                'Submitted answer: a string for simple fields, an object keyed by sub-key for compound fields (e.g. {"first": "Direct", "last": "Test"}), or an array for fields such as file upload. Omitted entirely when the question was not answered'
            ),
        prettyFormat: z.string().optional().describe('Human-readable rendering of the answer for compound fields (e.g. "Direct Test" for a full name)')
    })
    .describe('Answer entry for a single form question. The parent answers map is keyed by the question ID (qid) of the form the submission belongs to');

const SubmissionSchema = z
    .object({
        id: z.string().describe('Jotform submission ID, unique across the account (e.g. "6665953522666321061")'),
        form_id: z.string().describe('ID of the form this submission belongs to (e.g. "262715780901055")'),
        ip: z.string().optional().describe('IP address of the submitter'),
        created_at: z.string().describe('Submission creation timestamp in "YYYY-MM-DD HH:MM:SS" format in the account timezone (e.g. "2026-09-30 12:35:52")'),
        status: z.string().optional().describe('Submission status (e.g. "ACTIVE")'),
        new: z.string().optional().describe('"1" if the submission has not been read yet, "0" otherwise'),
        flag: z.string().optional().describe('"1" if the submission is flagged, "0" otherwise'),
        notes: z.string().optional().describe('Notes attached to the submission (empty string when none)'),
        updated_at: z.string().nullable().optional().describe('Last edit timestamp in "YYYY-MM-DD HH:MM:SS" format; null when the submission was never edited'),
        answers: z
            .record(z.string(), SubmissionAnswerSchema)
            .optional()
            .describe('Map of question ID (qid) to answer entry. An entry only contains "answer" when the question was actually answered')
    })
    .describe('A Jotform form submission');

const CheckpointSchema = z.object({
    created_after: z
        .string()
        .describe(
            'Highest submission created_at ("YYYY-MM-DD HH:MM:SS") from the last fully completed sync run; the next run requests submissions created after this value minus a 1 second overlap'
        )
});

function oneSecondEarlier(dateTime: string): string {
    const millis = Date.parse(`${dateTime.replace(' ', 'T')}Z`);
    if (Number.isNaN(millis)) {
        return dateTime;
    }
    return new Date(millis - 1000).toISOString().slice(0, 19).replace('T', ' ');
}

const sync = createSync({
    description: 'Sync all submissions across all forms in the Jotform account, incrementally by creation date.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Submission: SubmissionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const createdAfter = checkpoint?.created_after;
        let maxCreatedAt = createdAfter;

        const params: Record<string, string> = {
            orderby: 'created_at'
        };

        if (createdAfter) {
            // Jotform's created_at:gt comparison is exclusive at second granularity,
            // so subtract one second to avoid missing submissions at the boundary.
            params['filter'] = JSON.stringify({ 'created_at:gt': oneSecondEarlier(createdAfter) });
        }

        const proxyConfig: ProxyConfiguration = {
            // https://api.jotform.com/docs/#user-submissions
            endpoint: '/user/submissions',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'content'
            },
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof SubmissionSchema>>(proxyConfig)) {
            if (page.length === 0) {
                continue;
            }

            const submissions = page.map((raw) => SubmissionSchema.parse(raw));
            await nango.batchSave(submissions, 'Submission');

            for (const submission of submissions) {
                if (!maxCreatedAt || submission.created_at > maxCreatedAt) {
                    maxCreatedAt = submission.created_at;
                }
            }
        }

        // Jotform can return newest submissions first for created_at ordering, so only
        // advance the checkpoint once the full filtered window has been processed.
        // Saving per page could skip older pages from the same run after an interruption.
        if (maxCreatedAt && maxCreatedAt !== createdAfter) {
            await nango.saveCheckpoint({ created_after: maxCreatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
