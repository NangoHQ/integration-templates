import { createSync } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const LeverPostingApplySchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    customQuestions: z.array(z.unknown()).optional(),
    eeoQuestions: z.unknown().optional(),
    personalInformation: z.array(z.unknown()).optional(),
    urls: z.array(z.unknown()).optional()
});

const PostingSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ApplyResponseSchema = z
    .object({
        data: z
            .object({
                id: z.string().optional(),
                text: z.string().optional(),
                customQuestions: z.array(z.unknown()).optional(),
                eeoQuestions: z.unknown().optional(),
                personalInformation: z.array(z.unknown()).optional(),
                urls: z.array(z.unknown()).optional()
            })
            .passthrough()
    })
    .passthrough();

const sync = createSync({
    description: "Fetches a list of all questions included in a posting's application form in Lever",
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    metadata: z.object({}),
    models: {
        LeverPostingApply: LeverPostingApplySchema
    },

    exec: async (nango) => {
        let totalRecords = 0;

        await nango.trackDeletesStart('LeverPostingApply');

        // https://hire.lever.co/developer/documentation#list-all-postings
        const records: z.infer<typeof PostingSchema>[] = [];

        for await (const recordBatch of nango.paginate({
            endpoint: '/v1/postings',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT
            },
            retries: 3
        })) {
            for (const record of recordBatch) {
                records.push(PostingSchema.parse(record));
            }
        }

        for (const posting of records) {
            const endpoint = `/v1/postings/${encodeURIComponent(posting.id)}/apply`;
            // https://hire.lever.co/developer/documentation#apply-to-a-posting
            const applyResponse = await nango.get({ endpoint, retries: 3 });
            const parsedResponse = ApplyResponseSchema.safeParse(applyResponse.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid apply response for posting ${posting.id}: ${parsedResponse.error.message}`);
            }

            const applyData = parsedResponse.data.data;
            const mappedApply = {
                id: applyData.id || posting.id,
                text: applyData.text,
                customQuestions: applyData.customQuestions,
                eeoQuestions: applyData.eeoQuestions,
                personalInformation: applyData.personalInformation,
                urls: applyData.urls
            };

            const parsedApply = LeverPostingApplySchema.safeParse(mappedApply);
            if (!parsedApply.success) {
                throw new Error(`Invalid apply data for posting ${posting.id}: ${parsedApply.error.message}`);
            }

            totalRecords++;
            await nango.log(`Saving apply for posting ${posting.id} (total applie(s): ${totalRecords})`);
            await nango.batchSave([parsedApply.data], 'LeverPostingApply');
        }

        await nango.trackDeletesEnd('LeverPostingApply');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
