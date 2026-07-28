import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sortField: z.enum(['title', 'statusCode', 'dueDate', 'completedDate', 'owner', 'team', 'dueDateQuarter']).describe('Field to sort by. Example: "dueDate"'),
    sortDirection: z.enum(['ASC', 'DESC']).describe('Sort direction. Example: "ASC"'),
    pageSize: z.number().int().min(0).max(200).describe('Number of results per page (0-200). Example: 50'),
    pageIndex: z.number().int().min(0).describe('Page index (0-based). Example: 0'),
    title: z.string().optional().describe('Optional title filter. Example: "Q1 Rock"'),
    teamId: z.string().optional().describe('Optional team ID filter. Example: "6a616ba8908190d6d9458153"')
});

const MilestoneSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        dueDate: z.string(),
        statusCode: z.string(),
        rockId: z.string(),
        createdDate: z.string().optional(),
        updatedAt: z.string().nullable().optional()
    })
    .passthrough();

const RockSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        statusCode: z.enum(['OFF_TRACK', 'ON_TRACK', 'DONE', 'CANCELED']),
        dueDate: z.string(),
        completedDate: z.string().nullable().optional(),
        teamId: z.string(),
        levelCode: z.enum(['USER', 'COMPANY_AND_DEPARTMENT', 'COMPANY', 'DEPARTMENT']),
        quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'None']),
        milestones: z.array(MilestoneSchema).optional(),
        createdDate: z.string().optional(),
        updatedAt: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(RockSchema),
    nextPageIndex: z.number().int().optional()
});

const QueryResponseSchema = z.record(z.string(), z.array(z.unknown()));

const action = createAction({
    description: 'Query rocks grouped by team with filtering and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            sortField: input.sortField,
            sortDirection: input.sortDirection,
            pageSize: input.pageSize,
            pageIndex: input.pageIndex
        };

        if (input.title !== undefined) {
            requestBody['title'] = input.title;
        }

        if (input.teamId !== undefined) {
            requestBody['teamId'] = input.teamId;
        }

        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            // Interactive spec: https://api.public.ninety.io/v1/swagger
            endpoint: '/v1/rocks/query',
            data: requestBody,
            retries: 3
        });

        const parsedResponse = QueryResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from rocks query endpoint.'
            });
        }

        const items: z.infer<typeof RockSchema>[] = [];

        for (const [teamId, rocks] of Object.entries(parsedResponse.data)) {
            if (!Array.isArray(rocks)) {
                continue;
            }

            for (const rawRock of rocks) {
                if (rawRock == null || typeof rawRock !== 'object') {
                    continue;
                }

                const parsedRock = RockSchema.safeParse(rawRock);
                if (parsedRock.success) {
                    items.push(parsedRock.data);
                } else {
                    await nango.log(`Warning: failed to parse rock for team ${teamId}: ${parsedRock.error.message}`);
                }
            }
        }

        const nextPageIndex = items.length > 0 ? input.pageIndex + 1 : undefined;

        return {
            items,
            ...(nextPageIndex !== undefined && { nextPageIndex })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
