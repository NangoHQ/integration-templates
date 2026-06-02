import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('The maximum number of items to return. The maximum and default value is 100.'),
    includeArchived: z.boolean().optional().describe('When true, includes archived items.'),
    syncToken: z.string().optional().describe('An opaque token representing the last time the data was successfully synced from the API.')
});

const ProviderDepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    externalName: z.string().nullable().optional(),
    isArchived: z.boolean(),
    parentId: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    extraData: z.record(z.string(), z.unknown()).nullable().optional()
});

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    externalName: z.string().optional(),
    isArchived: z.boolean(),
    parentId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    extraData: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(DepartmentSchema),
    nextCursor: z.string().optional(),
    moreDataAvailable: z.boolean(),
    syncToken: z.string().optional()
});

const action = createAction({
    description: 'List departments from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-departments',
        group: 'Departments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizationRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/departmentlist
            endpoint: '/department.list',
            data: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.includeArchived !== undefined && { includeArchived: input.includeArchived }),
                ...(input.syncToken !== undefined && { syncToken: input.syncToken })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = z
            .object({
                success: z.boolean(),
                results: z.array(ProviderDepartmentSchema),
                moreDataAvailable: z.boolean(),
                nextCursor: z.string().optional(),
                syncToken: z.string().optional()
            })
            .parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Ashby API returned a non-success response'
            });
        }

        return {
            items: providerResponse.results.map((dept) => ({
                id: dept.id,
                name: dept.name,
                ...(dept.externalName != null && { externalName: dept.externalName }),
                isArchived: dept.isArchived,
                ...(dept.parentId != null && { parentId: dept.parentId }),
                createdAt: dept.createdAt,
                updatedAt: dept.updatedAt,
                ...(dept.extraData != null && { extraData: dept.extraData })
            })),
            moreDataAvailable: providerResponse.moreDataAvailable,
            ...(providerResponse.nextCursor !== undefined && { nextCursor: providerResponse.nextCursor }),
            ...(providerResponse.syncToken !== undefined && { syncToken: providerResponse.syncToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
