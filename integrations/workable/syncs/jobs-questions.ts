import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { WorkableJobQuestion } from '../models.js';
import { z } from 'zod';

const CHUNK_SIZE = 100;

const sync = createSync({
    description: 'Fetches a list of questions for the specified job from workable',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/workable/jobs-questions'
        }
    ],

    scopes: ['r_jobs'],

    models: {
        WorkableJobQuestion: WorkableJobQuestion
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const totalRecords = 0;

        const jobs: any[] = await getAllJobs(nango);

        for (const job of jobs) {
            const endpoint = `/spi/v3/jobs/${job.shortcode}/questions`;

            const response = await nango.get({
                // https://workable.readme.io/reference/job-questions
                endpoint,
                retries: 10
            });
            const questions: any[] = response.data.questions || [];

            const mappedQuestions: WorkableJobQuestion[] = questions.map(mapQuestion) || [];

            // Process questions in chunks since the endpoint doesn't offer pagination
            await processChunks(nango, mappedQuestions, job.shortcode, totalRecords);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function processChunks(nango: NangoSyncLocal, data: WorkableJobQuestion[], shortcode: string, totalRecords: number) {
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const batchSize = chunk.length;
        totalRecords += batchSize;
        await nango.log(`Saving batch of ${batchSize} question(s) for job ${shortcode} (total question(s): ${totalRecords})`);
        await nango.batchSave(chunk, 'WorkableJobQuestion');
    }
}

async function getAllJobs(nango: NangoSyncLocal) {
    const records: any[] = [];
    const config: ProxyConfiguration = {
        // https://workable.readme.io/reference/jobs
        endpoint: '/spi/v3/jobs',
        paginate: {
            type: 'link',
            link_path_in_response_body: 'paging.next',
            limit_name_in_request: 'limit',
            response_path: 'jobs',
            limit: 100
        }
    };

    for await (const recordBatch of nango.paginate(config)) {
        records.push(...recordBatch);
    }

    return records;
}

function mapQuestion(question: any): WorkableJobQuestion {
    return {
        id: question.id,
        body: question.body,
        type: question.type,
        required: question.required,
        single_answer: question.single_answer,
        choices: question.choices,
        supported_file_types: question.supported_file_types,
        max_file_size: question.max_file_size
    };
}
