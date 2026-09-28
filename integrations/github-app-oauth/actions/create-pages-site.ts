import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "octocat"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "hello-world"'),
        build_type: z
            .enum(['legacy', 'workflow'])
            .optional()
            .describe(
                'The process used to build the site. "legacy" builds the site when changes are pushed to the source branch; "workflow" builds it with a custom GitHub Actions workflow. Example: "legacy"'
            ),
        source: z
            .object({
                branch: z.string().describe('The repository branch used to publish the site source files. Example: "main"'),
                path: z
                    .enum(['/', '/docs'])
                    .optional()
                    .describe(
                        'The repository directory that includes the site source files. Allowed paths are "/" (repository root) and "/docs". Defaults to "/". Example: "/"'
                    )
            })
            .describe('The source branch and directory used to publish the Pages site')
    })
    .describe('Parameters for enabling and configuring a GitHub Pages site for a repository');

const PagesSourceOutputSchema = z
    .object({
        branch: z.string().describe('The repository branch used to publish the site source files. Example: "main"'),
        path: z.string().describe('The repository directory that includes the site source files. Example: "/docs"')
    })
    .describe('The source branch and directory from which the site is published');

const OutputSchema = z
    .object({
        url: z.string().describe('The API URL of the GitHub Pages site. Example: "https://api.github.com/repos/octocat/hello-world/pages"'),
        status: z
            .enum(['built', 'building', 'errored'])
            .optional()
            .describe('The build status of the site. Omitted when the site has not been built yet. Example: "built"'),
        cname: z.string().optional().describe('The custom domain configured for the site. Omitted when no custom domain is set. Example: "docs.example.com"'),
        custom_404: z.boolean().describe('Whether the site serves a custom 404 page. Example: false'),
        html_url: z.string().optional().describe('The absolute URL of the rendered site. Example: "https://octocat.github.io/hello-world"'),
        build_type: z.enum(['legacy', 'workflow']).optional().describe('The process used to build the site. Example: "legacy"'),
        source: PagesSourceOutputSchema.optional().describe('The source branch and directory from which the site is published'),
        public: z.boolean().optional().describe('Whether the site is visible to the public. Example: true'),
        protected_domain_state: z
            .enum(['pending', 'verified', 'unverified'])
            .optional()
            .describe('The verification state of the site protected custom domain. Omitted when no protected domain is configured. Example: "verified"'),
        pending_domain_unverified_at: z
            .string()
            .optional()
            .describe(
                'Timestamp in ISO 8601 format after which the pending unverified custom domain is removed. Omitted when not applicable. Example: "2026-09-01T00:00:00Z"'
            ),
        https_enforced: z.boolean().optional().describe('Whether HTTPS is enforced for the site. Example: true')
    })
    .describe('The created GitHub Pages site configuration');

const ProviderPagesSiteSchema = z.object({
    url: z.string(),
    status: z.enum(['built', 'building', 'errored']).nullable().optional(),
    cname: z.string().nullable().optional(),
    custom_404: z.boolean(),
    html_url: z.string().optional(),
    build_type: z.enum(['legacy', 'workflow']).nullable().optional(),
    source: z
        .object({
            branch: z.string(),
            path: z.string()
        })
        .optional(),
    public: z.boolean().optional(),
    protected_domain_state: z.enum(['pending', 'verified', 'unverified']).nullable().optional(),
    pending_domain_unverified_at: z.string().nullable().optional(),
    https_enforced: z.boolean().optional()
});

/**
 * @tags: [write]
 * @tagReason: Enables and configures a GitHub Pages site in the repository through a single provider-side creation call.
 * @pitfalls: Returns 409 Conflict when a Pages site already exists for the repository; delete or update the existing site instead of creating a new one. The caller must be a repository administrator, maintainer, or hold the manage GitHub Pages settings permission, otherwise GitHub responds with 403. Enabling the site starts an asynchronous build, so the returned site can report status "building" instead of "built".
 */
const action = createAction({
    description: 'Enable and configure a GitHub Pages site for a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pages`,
            data: {
                ...(input.build_type !== undefined && { build_type: input.build_type }),
                source: {
                    branch: input.source.branch,
                    ...(input.source.path !== undefined && { path: input.source.path })
                }
            },
            retries: 3
        });

        const site = ProviderPagesSiteSchema.parse(response.data);

        return {
            url: site.url,
            custom_404: site.custom_404,
            ...(site.status != null && { status: site.status }),
            ...(site.cname != null && { cname: site.cname }),
            ...(site.html_url !== undefined && { html_url: site.html_url }),
            ...(site.build_type != null && { build_type: site.build_type }),
            ...(site.source !== undefined && { source: { branch: site.source.branch, path: site.source.path } }),
            ...(site.public !== undefined && { public: site.public }),
            ...(site.protected_domain_state != null && { protected_domain_state: site.protected_domain_state }),
            ...(site.pending_domain_unverified_at != null && { pending_domain_unverified_at: site.pending_domain_unverified_at }),
            ...(site.https_enforced !== undefined && { https_enforced: site.https_enforced })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
