import { createSync } from 'nango';
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

const PagingSchema = z.object({
    next: z.string().nullable().optional()
});

const JobsResponseSchema = z.object({
    jobs: z.array(z.unknown()),
    paging: PagingSchema.optional()
});

const CheckpointSchema = z.object({
    jobs_page_url: z.string(),
    job_index: z.number().int().min(0)
});

const RawJobSchema = z
    .object({
        shortcode: z.string()
    })
    .passthrough();

const parseUrlForProxy = (url: string): { endpoint: string; params: Record<string, string> } => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = new URL(url);
        return {
            endpoint: parsed.pathname,
            params: Object.fromEntries(parsed.searchParams.entries())
        };
    }
    const queryIndex = url.indexOf('?');
    const path = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
    const query = queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
    return {
        endpoint: path,
        params: query ? Object.fromEntries(new URLSearchParams(query).entries()) : {}
    };
};

const sync = createSync({
    description: 'Sync application questions for each job.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        JobQuestion: JobQuestionSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { jobs_page_url: '', job_index: 0 });

        // Blocker: /jobs/{shortcode}/questions has no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('JobQuestion');

        let jobsEndpoint = '/spi/v3/jobs';
        let jobsParams: Record<string, string> = { limit: '100' };
        let jobIndex = 0;
        let currentPageUrl = '';

        if (checkpoint.jobs_page_url) {
            currentPageUrl = checkpoint.jobs_page_url;
            const parsed = parseUrlForProxy(currentPageUrl);
            jobsEndpoint = parsed.endpoint;
            jobsParams = parsed.params;
            jobIndex = checkpoint.job_index;
        } else {
            const queryString = new URLSearchParams(jobsParams).toString();
            currentPageUrl = queryString ? `${jobsEndpoint}?${queryString}` : jobsEndpoint;
        }

        while (true) {
            // https://workable.readme.io/reference/jobs.md
            const jobsResponse = await nango.get({
                endpoint: jobsEndpoint,
                params: jobsParams,
                retries: 3
            });

            const parsedJobsResponse = JobsResponseSchema.safeParse(jobsResponse.data);
            if (!parsedJobsResponse.success) {
                throw new Error(`Failed to parse jobs response: ${parsedJobsResponse.error.message}`);
            }

            const jobsPage = parsedJobsResponse.data.jobs;
            if (!Array.isArray(jobsPage)) {
                throw new Error('Unexpected jobs page format: expected array');
            }

            for (let i = jobIndex; i < jobsPage.length; i++) {
                const rawJob = jobsPage[i];
                const jobResult = RawJobSchema.safeParse(rawJob);
                if (!jobResult.success) {
                    throw new Error('Unexpected job item format: missing shortcode');
                }

                const job = jobResult.data;

                // https://workable.readme.io/reference/job-questions.md
                const questionsResponse = await nango.get({
                    endpoint: `/spi/v3/jobs/${encodeURIComponent(job.shortcode)}/questions`,
                    retries: 3
                });

                const parsed = ProviderQuestionsResponseSchema.safeParse(questionsResponse.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse questions for job ${job.shortcode}: ${parsed.error.message}`);
                }

                const questions = [];
                for (const question of parsed.data.questions) {
                    questions.push({
                        id: `${job.shortcode}_${question.id}`,
                        job_shortcode: job.shortcode,
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

                if (questions.length > 0) {
                    await nango.batchSave(questions, 'JobQuestion');
                }

                await nango.saveCheckpoint({
                    jobs_page_url: currentPageUrl,
                    job_index: i + 1
                });
            }

            const nextUrl = parsedJobsResponse.data.paging?.next ?? null;
            if (!nextUrl) {
                break;
            }

            currentPageUrl = nextUrl;
            const parsedNext = parseUrlForProxy(nextUrl);
            jobsEndpoint = parsedNext.endpoint;
            jobsParams = parsedNext.params;
            jobIndex = 0;

            await nango.saveCheckpoint({
                jobs_page_url: currentPageUrl,
                job_index: 0
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('JobQuestion');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
