import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: "0oa14y5qldjOIAGrc698"'),
    groupId: z.string().describe('Group ID. Example: "00g14y5qi7zRLgyzT698"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    appId: z.string(),
    groupId: z.string()
});

const action = createAction({
    description: 'Unassign a group from an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input) => {
        const response = await nango.delete({
            // https://developer.okta.com/docs/reference/api/apps/#unassign-group-from-application
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/groups/${encodeURIComponent(input.groupId)}`,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Unexpected status code ${String(response.status)} when unassigning group from application.`,
                appId: input.appId,
                groupId: input.groupId
            });
        }

        return {
            success: true,
            appId: input.appId,
            groupId: input.groupId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
