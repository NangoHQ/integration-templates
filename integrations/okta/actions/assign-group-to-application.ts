import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: 0oa14y5qldjOIAGrc698'),
    groupId: z.string().describe('Group ID. Example: 00g14y5qi7zRLgyzT698'),
    priority: z.number().optional().describe('Priority assigned to the group. If omitted, the next highest priority is assigned by default.')
});

const ProviderApplicationGroupSchema = z.object({
    id: z.string(),
    priority: z.number().optional(),
    lastUpdated: z.string().optional(),
    profile: z.record(z.string(), z.unknown()).optional(),
    _links: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    priority: z.number().optional(),
    lastUpdated: z.string().optional(),
    profile: z.record(z.string(), z.unknown()).optional(),
    _links: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Assign a group to an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.okta.com/docs/reference/api/apps/#assign-group-to-application
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/groups/${encodeURIComponent(input.groupId)}`,
            data: {
                ...(input.priority !== undefined && { priority: input.priority })
            },
            retries: 3
        });

        const providerGroup = ProviderApplicationGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            ...(providerGroup.priority !== undefined && { priority: providerGroup.priority }),
            ...(providerGroup.lastUpdated !== undefined && { lastUpdated: providerGroup.lastUpdated }),
            ...(providerGroup.profile !== undefined && { profile: providerGroup.profile }),
            ...(providerGroup._links !== undefined && { _links: providerGroup._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
