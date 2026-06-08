import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderOptionSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    archived: z.string().optional(),
    manageable: z.string().optional(),
    createdDate: z.string().nullable().optional(),
    archivedDate: z.string().nullable().optional()
});

const ProviderListSchema = z.object({
    id: z.number().optional(),
    fieldId: z.number().optional(),
    manageable: z.string().optional(),
    multiple: z.string().optional(),
    name: z.string().optional(),
    alias: z.string().optional(),
    options: z.array(ProviderOptionSchema).optional()
});

const JobTitleOptionSchema = z.object({
    id: z.string(),
    name: z.string(),
    archived: z.string().optional()
});

const OutputSchema = z.object({
    options: z.array(JobTitleOptionSchema)
});

const action = createAction({
    description: 'List job titles configured in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-job-titles',
        group: 'Metadata'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-list-fields
            endpoint: '/v1/meta/lists',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const providerLists = z.array(ProviderListSchema).parse(response.data);

        const jobTitleList = providerLists.find((list) => list.alias === 'jobTitle' || list.name === 'Job Title');

        if (!jobTitleList) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Job Title list not found in BambooHR account.'
            });
        }

        const options = (jobTitleList.options || []).map((option) => ({
            id: String(option.id),
            name: option.name,
            ...(option.archived !== undefined && { archived: option.archived })
        }));

        return {
            options
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
