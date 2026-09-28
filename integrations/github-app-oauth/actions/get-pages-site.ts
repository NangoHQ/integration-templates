import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "octocat"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "Hello-World"')
    })
    .describe('Repository coordinates used to look up the GitHub Pages site configuration');

const PagesSourceSchema = z
    .object({
        branch: z.string().describe('The repository branch used to publish the site source files. Example: "main"'),
        path: z.string().describe('The repository directory that includes the source files for the Pages site. Example: "/" or "/docs"')
    })
    .describe('The source branch and directory used to publish the GitHub Pages site');

const PagesHttpsCertificateSchema = z
    .object({
        state: z
            .enum([
                'new',
                'authorization_created',
                'authorization_pending',
                'authorized',
                'authorization_revoked',
                'issued',
                'uploaded',
                'approved',
                'errored',
                'bad_authz',
                'destroy_pending',
                'dns_changed'
            ])
            .describe('The state of the HTTPS certificate for the Pages site custom domain'),
        description: z.string().describe('A human readable description of the HTTPS certificate state'),
        domains: z.array(z.string()).describe('The domains covered by the HTTPS certificate'),
        expires_at: z.string().optional().describe('The date the HTTPS certificate expires. Example: "2026-05-21"')
    })
    .describe('The HTTPS certificate provisioned for the GitHub Pages site custom domain');

const PagesSiteSchema = z
    .object({
        url: z.string().describe('The API URL of the GitHub Pages site resource. Example: "https://api.github.com/repos/octocat/Hello-World/pages"'),
        status: z
            .enum(['built', 'building', 'errored'])
            .nullable()
            .describe('The build status of the most recent Pages build, or null if the site has never been built'),
        cname: z.string().nullable().describe('The custom domain configured for the Pages site, or null when no custom domain is set'),
        protected_domain_state: z
            .enum(['pending', 'verified', 'unverified'])
            .nullable()
            .optional()
            .describe('The verification state of the custom domain when domain protection is in use'),
        pending_domain_unverified_at: z.string().nullable().optional().describe('The timestamp at which a pending custom domain will become unverified'),
        custom_404: z.boolean().describe('Whether the Pages site uses a custom 404 page'),
        html_url: z.string().optional().describe('The public URL of the published Pages site. Example: "https://octocat.github.io/Hello-World/"'),
        build_type: z
            .enum(['legacy', 'workflow'])
            .nullable()
            .optional()
            .describe('How the site is built: "legacy" (built by GitHub on push) or "workflow" (built by a GitHub Actions workflow)'),
        source: PagesSourceSchema.optional().describe('The source branch and directory the site is published from'),
        public: z.boolean().describe('Whether the Pages site is publicly visible'),
        https_certificate: PagesHttpsCertificateSchema.optional().describe('The HTTPS certificate details for the custom domain, when one is configured'),
        https_enforced: z.boolean().optional().describe('Whether HTTPS is enforced for the Pages site')
    })
    .describe('The GitHub Pages site configuration as returned by the GitHub REST API');

const OutputSchema = z
    .object({
        site: PagesSiteSchema.nullable().describe(
            'The GitHub Pages site configuration, or null when Pages has never been enabled for the repository (GitHub responds 404 in that case)'
        )
    })
    .describe('Result of fetching the repository GitHub Pages site configuration');

function getErrorStatus(error: unknown): number | null {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return null;
    }
    const { response } = error;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return null;
    }
    const { status } = response;
    return typeof status === 'number' ? status : null;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the repository's GitHub Pages site configuration and never mutates provider state.
 * @pitfalls: Returns { site: null } whenever GitHub responds 404, which is the expected signal when Pages was never enabled on the repository. GitHub also responds 404 instead of 403 when the repository does not exist or the token lacks the GitHub App Pages read permission, so a null site alone cannot prove Pages is disabled.
 */
const action = createAction({
    description: 'Get the GitHub Pages site configuration of a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: GitHub's Pages API responds 404 when Pages was never enabled on the repository; that expected not-configured state is
        // returned as { site: null } instead of propagating as an error.
        try {
            // https://docs.github.com/en/rest/pages/pages#get-a-github-pages-site
            const response = await nango.get<unknown>({
                endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pages`,
                retries: 3
            });

            if (response.status === 404) {
                // Recorded test fixtures resolve with a 404 status instead of throwing like the live proxy does.
                return { site: null };
            }

            const site = PagesSiteSchema.parse(response.data);

            return { site };
        } catch (error) {
            if (getErrorStatus(error) === 404) {
                return { site: null };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
