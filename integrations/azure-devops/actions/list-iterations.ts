import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "nangodev"'),
    team: z.string().describe('Team ID or team name. Example: "nangodev Team"'),
    timeframe: z.enum(['current', 'past', 'future']).optional().describe('Filter for which iterations are returned based on relative time.')
});

const TeamIterationAttributesSchema = z.object({
    startDate: z.string().nullable().optional(),
    finishDate: z.string().nullable().optional(),
    timeFrame: z.enum(['past', 'current', 'future']).nullable().optional()
});

const ProviderIterationSchema = z.object({
    id: z.string(),
    name: z.string(),
    path: z.string().optional(),
    url: z.string().optional(),
    attributes: TeamIterationAttributesSchema.nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            path: z.string().optional(),
            url: z.string().optional(),
            attributes: z
                .object({
                    startDate: z.string().optional(),
                    finishDate: z.string().optional(),
                    timeFrame: z.enum(['past', 'current', 'future']).optional()
                })
                .optional()
        })
    )
});

const action = createAction({
    description: 'List sprint iterations for a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/work/iterations/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/${encodeURIComponent(input.team)}/_apis/work/teamsettings/iterations`,
            params: {
                'api-version': '7.2-preview.1',
                ...(input.timeframe && { $timeframe: input.timeframe })
            },
            retries: 3
        });

        const providerData = z
            .object({
                value: z.array(ProviderIterationSchema).optional()
            })
            .parse(response.data);

        const items = (providerData.value || []).map((item) => {
            const normalizedAttributes = item.attributes
                ? {
                      ...(item.attributes.startDate != null && { startDate: item.attributes.startDate }),
                      ...(item.attributes.finishDate != null && { finishDate: item.attributes.finishDate }),
                      ...(item.attributes.timeFrame != null && { timeFrame: item.attributes.timeFrame })
                  }
                : undefined;

            return {
                id: item.id,
                name: item.name,
                ...(item.path != null && { path: item.path }),
                ...(item.url != null && { url: item.url }),
                ...(normalizedAttributes && { attributes: normalizedAttributes })
            };
        });

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
