import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    idOrName: z.string().describe('The unique project identifier or the project name. Example: "nango-test-main"'),
    name: z.string().max(100).optional().describe('The desired name for the project'),
    buildCommand: z
        .string()
        .max(256)
        .nullable()
        .optional()
        .describe('The build command for this project. When null is used this value will be automatically detected'),
    devCommand: z
        .string()
        .max(256)
        .nullable()
        .optional()
        .describe('The dev command for this project. When null is used this value will be automatically detected'),
    framework: z
        .enum([
            'container',
            'blitzjs',
            'nextjs',
            'gatsby',
            'remix',
            'react-router',
            'astro',
            'hexo',
            'eleventy',
            'docusaurus-2',
            'docusaurus',
            'preact',
            'solidstart-1',
            'solidstart',
            'dojo',
            'ember',
            'vue',
            'scully',
            'ionic-angular',
            'angular',
            'polymer',
            'svelte',
            'sveltekit',
            'sveltekit-1',
            'ionic-react',
            'create-react-app',
            'gridsome',
            'umijs',
            'sapper',
            'saber',
            'stencil',
            'nuxtjs',
            'redwoodjs',
            'hugo',
            'jekyll',
            'brunch',
            'middleman',
            'zola',
            'hydrogen',
            'vite',
            'tanstack-start',
            'tanstack-start-lovable',
            'vitepress',
            'vuepress',
            'parcel',
            'fastapi',
            'flask',
            'fasthtml',
            'django',
            'ash',
            'eve',
            'sanity',
            'sanity-v2',
            'storybook',
            'nitro',
            'hono',
            'express',
            'h3',
            'koa',
            'nestjs',
            'elysia',
            'fastify',
            'xmcp',
            'python',
            'ruby',
            'rust',
            'axum',
            'actix-web',
            'bun',
            'node',
            'go',
            'services',
            'mastra'
        ])
        .nullable()
        .optional()
        .describe('The framework that is being used for this project. When null is used no framework is selected'),
    installCommand: z
        .string()
        .max(256)
        .nullable()
        .optional()
        .describe('The install command for this project. When null is used this value will be automatically detected'),
    outputDirectory: z
        .string()
        .max(256)
        .nullable()
        .optional()
        .describe('The output directory of the project. When null is used this value will be automatically detected'),
    rootDirectory: z
        .string()
        .max(256)
        .nullable()
        .optional()
        .describe('The name of a directory or relative path to the source code of your project. When null is used it will default to the project root'),
    directoryListing: z.boolean().optional().describe('Specifies whether directory listing is enabled'),
    publicSource: z.boolean().nullable().optional().describe('Deprecated. Accepted for backwards compatibility but ignored.'),
    nodeVersion: z.enum(['24.x', '22.x', '20.x', '18.x', '16.x', '14.x', '12.x', '10.x']).optional().describe('The Node.js version for this project'),
    serverlessFunctionRegion: z.string().max(4).nullable().optional().describe('The region to deploy Serverless Functions in this project'),
    gitForkProtection: z
        .boolean()
        .optional()
        .describe('Specifies whether PRs from Git forks should require a team member authorization before it can be deployed'),
    gitLFS: z.boolean().optional().describe('Specifies whether Git LFS is enabled for this project'),
    customerSupportCodeVisibility: z.boolean().optional().describe('Specifies whether customer support can see git source for a deployment'),
    autoExposeSystemEnvs: z.boolean().optional().describe('Specifies whether system environment variables are automatically exposed'),
    commandForIgnoringBuildStep: z.string().max(256).nullable().optional().describe('The command for ignoring the build step'),
    previewDeploymentsDisabled: z.boolean().nullable().optional().describe('Specifies whether preview deployments are disabled for this project')
});

const ProviderLinkSchema = z
    .object({
        type: z.string().optional(),
        org: z.string().optional(),
        repo: z.string().optional(),
        productionBranch: z.string().optional()
    })
    .passthrough();

const ProviderProjectSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        accountId: z.string(),
        createdAt: z.number(),
        buildCommand: z.string().nullable().optional(),
        devCommand: z.string().nullable().optional(),
        framework: z.string().nullable().optional(),
        installCommand: z.string().nullable().optional(),
        outputDirectory: z.string().nullable().optional(),
        rootDirectory: z.string().nullable().optional(),
        directoryListing: z.boolean().optional(),
        publicSource: z.boolean().nullable().optional(),
        nodeVersion: z.string().optional(),
        serverlessFunctionRegion: z.string().nullable().optional(),
        gitForkProtection: z.boolean().optional(),
        gitLFS: z.boolean().optional(),
        customerSupportCodeVisibility: z.boolean().optional(),
        autoExposeSystemEnvs: z.boolean().optional(),
        commandForIgnoringBuildStep: z.string().nullable().optional(),
        previewDeploymentsDisabled: z.boolean().nullable().optional(),
        link: ProviderLinkSchema.nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountId: z.string(),
    createdAt: z.number(),
    buildCommand: z.string().nullable().optional(),
    devCommand: z.string().nullable().optional(),
    framework: z.string().nullable().optional(),
    installCommand: z.string().nullable().optional(),
    outputDirectory: z.string().nullable().optional(),
    rootDirectory: z.string().nullable().optional(),
    directoryListing: z.boolean().optional(),
    publicSource: z.boolean().nullable().optional(),
    nodeVersion: z.string().optional(),
    serverlessFunctionRegion: z.string().nullable().optional(),
    gitForkProtection: z.boolean().optional(),
    gitLFS: z.boolean().optional(),
    customerSupportCodeVisibility: z.boolean().optional(),
    autoExposeSystemEnvs: z.boolean().optional(),
    commandForIgnoringBuildStep: z.string().nullable().optional(),
    previewDeploymentsDisabled: z.boolean().nullable().optional(),
    link: z
        .object({
            type: z.string().optional(),
            org: z.string().optional(),
            repo: z.string().optional(),
            productionBranch: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input['name'] !== undefined) {
            body['name'] = input['name'];
        }
        if (input['buildCommand'] !== undefined) {
            body['buildCommand'] = input['buildCommand'];
        }
        if (input['devCommand'] !== undefined) {
            body['devCommand'] = input['devCommand'];
        }
        if (input['framework'] !== undefined) {
            body['framework'] = input['framework'];
        }
        if (input['installCommand'] !== undefined) {
            body['installCommand'] = input['installCommand'];
        }
        if (input['outputDirectory'] !== undefined) {
            body['outputDirectory'] = input['outputDirectory'];
        }
        if (input['rootDirectory'] !== undefined) {
            body['rootDirectory'] = input['rootDirectory'];
        }
        if (input['directoryListing'] !== undefined) {
            body['directoryListing'] = input['directoryListing'];
        }
        if (input['publicSource'] !== undefined) {
            body['publicSource'] = input['publicSource'];
        }
        if (input['nodeVersion'] !== undefined) {
            body['nodeVersion'] = input['nodeVersion'];
        }
        if (input['serverlessFunctionRegion'] !== undefined) {
            body['serverlessFunctionRegion'] = input['serverlessFunctionRegion'];
        }
        if (input['gitForkProtection'] !== undefined) {
            body['gitForkProtection'] = input['gitForkProtection'];
        }
        if (input['gitLFS'] !== undefined) {
            body['gitLFS'] = input['gitLFS'];
        }
        if (input['customerSupportCodeVisibility'] !== undefined) {
            body['customerSupportCodeVisibility'] = input['customerSupportCodeVisibility'];
        }
        if (input['autoExposeSystemEnvs'] !== undefined) {
            body['autoExposeSystemEnvs'] = input['autoExposeSystemEnvs'];
        }
        if (input['commandForIgnoringBuildStep'] !== undefined) {
            body['commandForIgnoringBuildStep'] = input['commandForIgnoringBuildStep'];
        }
        if (input['previewDeploymentsDisabled'] !== undefined) {
            body['previewDeploymentsDisabled'] = input['previewDeploymentsDisabled'];
        }

        // https://vercel.com/docs/rest-api/reference/endpoints/projects#update-an-existing-project
        const response = await nango.patch({
            endpoint: `/v9/projects/${encodeURIComponent(input['idOrName'])}`,
            data: body,
            retries: 3
        });

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            name: project.name,
            accountId: project.accountId,
            createdAt: project.createdAt,
            ...(project.buildCommand !== undefined && { buildCommand: project.buildCommand }),
            ...(project.devCommand !== undefined && { devCommand: project.devCommand }),
            ...(project.framework !== undefined && { framework: project.framework }),
            ...(project.installCommand !== undefined && { installCommand: project.installCommand }),
            ...(project.outputDirectory !== undefined && { outputDirectory: project.outputDirectory }),
            ...(project.rootDirectory !== undefined && { rootDirectory: project.rootDirectory }),
            ...(project.directoryListing !== undefined && { directoryListing: project.directoryListing }),
            ...(project.publicSource !== undefined && { publicSource: project.publicSource }),
            ...(project.nodeVersion !== undefined && { nodeVersion: project.nodeVersion }),
            ...(project.serverlessFunctionRegion !== undefined && { serverlessFunctionRegion: project.serverlessFunctionRegion }),
            ...(project.gitForkProtection !== undefined && { gitForkProtection: project.gitForkProtection }),
            ...(project.gitLFS !== undefined && { gitLFS: project.gitLFS }),
            ...(project.customerSupportCodeVisibility !== undefined && { customerSupportCodeVisibility: project.customerSupportCodeVisibility }),
            ...(project.autoExposeSystemEnvs !== undefined && { autoExposeSystemEnvs: project.autoExposeSystemEnvs }),
            ...(project.commandForIgnoringBuildStep !== undefined && { commandForIgnoringBuildStep: project.commandForIgnoringBuildStep }),
            ...(project.previewDeploymentsDisabled !== undefined && { previewDeploymentsDisabled: project.previewDeploymentsDisabled }),
            ...(project.link != null && {
                link: {
                    ...(project.link.type != null && { type: project.link.type }),
                    ...(project.link.org != null && { org: project.link.org }),
                    ...(project.link.repo != null && { repo: project.link.repo }),
                    ...(project.link.productionBranch != null && { productionBranch: project.link.productionBranch })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
