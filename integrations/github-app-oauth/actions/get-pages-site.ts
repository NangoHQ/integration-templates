import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"')
    })
    .describe("Input for retrieving a repository's GitHub Pages site configuration.");

const SourceSchema = z
    .object({
        branch: z.string().describe('The branch used as the source for the Pages site.').optional(),
        path: z.string().describe('The directory within the branch used as the source.').optional()
    })
    .describe('The source branch and directory for the Pages site.');

const OutputSchema = z
    .object({
        url: z.string().describe('The API URL of the Pages site.').optional(),
        status: z.enum(['built', 'building', 'errored']).describe('The build status of the Pages site.').optional(),
        cname: z.string().nullable().optional().describe('The configured custom domain, if any.'),
        custom_404: z.boolean().describe('Whether a custom 404 page is enabled.').optional(),
        html_url: z.string().describe('The URL to view the Pages site in a browser.').optional(),
        build_type: z.string().describe('The type of Pages build, such as "legacy" or "workflow".').optional(),
        source: SourceSchema.optional(),
        public: z.boolean().describe('Whether the Pages site is publicly visible.').optional(),
        protected_domain_state: z.string().nullable().optional().describe('The state of the domain protection verification.'),
        pending_domain_unverified_at: z.string().nullable().optional().describe('When the domain was last pending verification.'),
        https_enforced: z.boolean().describe('Whether HTTPS is enforced for the Pages site.').optional()
    })
    .describe('The GitHub Pages site configuration for a repository.');

/**
 * @tags: [read]
 * @tagReason: Retrieves the current GitHub Pages configuration for a repository without modifying any data.
 * @pitfalls: Returns 404 when Pages has never been enabled for the repository, which is the expected not-configured response.
 */
const action = createAction({
    description: "Get the configuration of a repository's GitHub Pages site.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/pages#get-a-github-pages-site
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pages`,
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an unexpected response format.'
            });
        }

        const providerData = OutputSchema.parse(data);

        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
