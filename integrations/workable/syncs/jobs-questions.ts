import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const QuestionChoiceSchema = z.object({
    id: z.string(),
    body: z.string()
});

const ProviderQuestionSchema = z.object({
    id: z.string(),
    body: z.string(),
    type: z.string(),
    required: z.boolean(),
    single_answer: z.boolean().optional(),
    choices: z.array(QuestionChoiceSchema).optional(),
    supported_file_types: z.array(z.string()).optional(),
    max_file_size: z.number().optional()
});

const ProviderQuestionsResponseSchema = z.object({
    questions: z.array(ProviderQuestionSchema)
});

const JobQuestionSchema = z.object({
    id: z.string(),
    job_shortcode: z.string(),
    question_id: z.string(),
    body: z.string(),
    type: z.string(),
    required: z.boolean(),
    single_answer: z.boolean().optional(),
    choices: z.array(QuestionChoiceSchema).optional(),
    supported_file_types: z.array(z.string()).optional(),
    max_file_size: z.number().optional()
});

const sync = createSync({
    description: 'Sync application questions for each job.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        JobQuestion: JobQuestionSchema
    },

    exec: async (nango) => {
        // Blocker: /jobs/{shortcode}/questions has no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        // trackDeletes requires starting from page 1 every run.
        await nango.trackDeletesStart('JobQuestion');

        const jobsProxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/jobs.md
            endpoint: '/spi/v3/jobs',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'jobs',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const jobsPage of nango.paginate(jobsProxyConfig)) {
            if (!Array.isArray(jobsPage)) {
                throw new Error('Unexpected jobs page format: expected array');
            }

            const questions = [];

            for (const rawJob of jobsPage) {
                if (typeof rawJob !== 'object' || rawJob === null || typeof rawJob.shortcode !== 'string') {
                    throw new Error('Unexpected job item format: missing shortcode');
                }

                // https://workable.readme.io/reference/job-questions.md
                const questionsResponse = await nango.get({
                    endpoint: `/spi/v3/jobs/${encodeURIComponent(rawJob.shortcode)}/questions`,
                    retries: 3
                });

                const parsed = ProviderQuestionsResponseSchema.safeParse(questionsResponse.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse questions for job ${rawJob.shortcode}: ${parsed.error.message}`);
                }

                for (const question of parsed.data.questions) {
                    questions.push({
                        id: `${rawJob.shortcode}_${question.id}`,
                        job_shortcode: rawJob.shortcode,
                        question_id: question.id,
                        body: question.body,
                        type: question.type,
                        required: question.required,
                        ...(question.single_answer !== undefined && { single_answer: question.single_answer }),
                        ...(question.choices !== undefined && { choices: question.choices }),
                        ...(question.supported_file_types !== undefined && { supported_file_types: question.supported_file_types }),
                        ...(question.max_file_size !== undefined && { max_file_size: question.max_file_size })
                    });
                }
            }

            if (questions.length > 0) {
                await nango.batchSave(questions, 'JobQuestion');
            }
        }

        await nango.trackDeletesEnd('JobQuestion');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
