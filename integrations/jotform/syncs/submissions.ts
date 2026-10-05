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
            'Highest submission created_at ("YYYY-MM-DD HH:MM:SS") from the last fully completed sync run; the next run requests newly created submissions after this value minus a 1 second overlap'
        ),
    updated_after: z
        .string()
        .describe(
            'Highest submission updated_at ("YYYY-MM-DD HH:MM:SS") observed so far, seeded from created_after on the first completed run; the next run requests edited submissions after this value minus a 1 second overlap'
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
        const updatedAfter = checkpoint?.updated_after;
        let maxCreatedAt = createdAfter;
        let maxUpdatedAt = updatedAfter;

        // Deleted submissions disappear outright from GET /user/submissions (Jotform hard-deletes
        // them, unlike forms which are soft-deleted), and Jotform exposes no feed of deleted
        // submission IDs. Detecting deletions would require diffing a full enumeration of every
        // submission on every run, which defeats the point of this 5-minute incremental sync and
        // would also exhaust Jotform's daily API quota, so deletions are not tracked here: a
        // submission removed on Jotform remains in Nango's synced records.
        async function fetchAndSave(filterField: 'created_at' | 'updated_at', after: string | undefined): Promise<void> {
            const params: Record<string, string> = { orderby: filterField };
            if (after) {
                // Jotform's "field:gt" comparison is exclusive at second granularity,
                // so subtract one second to avoid missing submissions at the boundary.
                params['filter'] = JSON.stringify({ [`${filterField}:gt`]: oneSecondEarlier(after) });
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
                    if (submission.updated_at && (!maxUpdatedAt || submission.updated_at > maxUpdatedAt)) {
                        maxUpdatedAt = submission.updated_at;
                    }
                }
            }
        }

        // Pass 1: submissions created since the last run (every submission, on the first run).
        await fetchAndSave('created_at', createdAfter);

        // Pass 2: submissions edited since the last run. Jotform's submissions list has no single
        // filter for "created OR updated", so edits are caught with a second, separate request.
        // Skipped on the very first run: pass 1 above already fetched every submission's current
        // state, so there is nothing edited yet to catch - the watermark below seeds a baseline
        // for future edits instead.
        if (updatedAfter) {
            await fetchAndSave('updated_at', updatedAfter);
        }

        // Jotform can return submissions out of order for a given sort field, so only advance the
        // checkpoint once the full filtered window of both passes has been processed. Saving per
        // page could skip older pages from the same run after an interruption.
        if (maxCreatedAt && (maxCreatedAt !== createdAfter || maxUpdatedAt !== updatedAfter)) {
            await nango.saveCheckpoint({
                created_after: maxCreatedAt,
                // Seed the edit watermark from the newest known submission the first time a
                // checkpoint is saved, so pass 2 has a baseline to catch edits against going forward.
                updated_after: maxUpdatedAt ?? maxCreatedAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
