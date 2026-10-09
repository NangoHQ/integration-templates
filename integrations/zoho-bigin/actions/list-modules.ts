import { z } from 'zod';
import { createAction } from 'nango';

const ProfileSchema = z.object({
    id: z.string().describe('Unique ID of the permission profile.'),
    name: z.string().describe('Name of the permission profile. Example: "Administrator".')
});

const ModuleSchema = z.object({
    id: z.string().describe('Unique ID of the module.'),
    api_name: z.string().describe('API name of the module, used as the path segment in API requests. Example: "Accounts".'),
    module_name: z.string().describe('Internal name of the module. Example: "Accounts".'),
    singular_label: z.string().describe('Singular display label of the module. Example: "Company".'),
    plural_label: z.string().describe('Plural UI-facing label, which can differ from api_name. Example: "Companies" for the Accounts module.'),
    api_supported: z.boolean().describe('Whether the module is accessible through the Bigin API.'),
    visible: z.boolean().describe('Whether the module is visible in the Bigin UI.'),
    viewable: z.boolean().describe('Whether the current user can view records in the module.'),
    creatable: z.boolean().describe('Whether the current user can create records in the module.'),
    editable: z.boolean().describe('Whether the current user can edit records in the module.'),
    deletable: z.boolean().describe('Whether the current user can delete records in the module.'),
    profiles: z.array(ProfileSchema).describe('Permission profiles that can access the module.')
});

const InputSchema = z.object({}).describe('No input parameters are required; this action lists every module for the connection.');

const OutputSchema = z
    .object({
        modules: z.array(ModuleSchema).describe('All modules available in the Bigin org.')
    })
    .describe('The list of modules available in the Bigin org, including their API names, labels, and permissions.');

/**
 * @tags: [read]
 * @tagReason: Only reads the org's module metadata; it does not create, modify, or delete any provider data.
 * @pitfalls: Every module is listed regardless of API support or the connection's granted scopes, so some entries (for example api_supported false ones, or Pipelines/Tasks/Events/Calls under a limited-scope connection) cannot actually be queried. Use api_name, not plural_label, when building request paths because they can differ (Accounts vs Companies).
 */
const action = createAction({
    description: 'List all modules available in the Bigin org, with their API names, labels, and permissions.',
    version: '1.0.0',
    scopes: ['ZohoBigin.settings.ALL'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.bigin.com/developer/docs/apis/v2/modules-api.html
            endpoint: '/bigin/v2/settings/modules',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Bigin returned no module metadata.'
            });
        }

        const parsed = OutputSchema.parse(response.data);

        return {
            modules: parsed.modules
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
