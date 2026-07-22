import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The desired name for the project. Example: "my-project"'),
    framework: z.string().nullable().optional().describe('The framework for this project. When null is used no framework is selected. Example: "nextjs"'),
    buildCommand: z.string().nullable().optional().describe('The build command for this project. When null is used this value will be automatically detected'),
    devCommand: z.string().nullable().optional().describe('The dev command for this project. When null is used this value will be automatically detected'),
    installCommand: z
        .string()
        .nullable()
        .optional()
        .describe('The install command for this project. When null is used this value will be automatically detected'),
    outputDirectory: z
        .string()
        .nullable()
        .optional()
        .describe('The output directory of the project. When null is used this value will be automatically detected'),
    rootDirectory: z
        .string()
        .nullable()
        .optional()
        .describe('The name of a directory or relative path to the source code of your project. When null is used it will default to the project root')
});

const ProviderProjectSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        accountId: z.string(),
        createdAt: z.number().optional(),
        framework: z.string().nullable().optional(),
        buildCommand: z.string().nullable().optional(),
        devCommand: z.string().nullable().optional(),
        installCommand: z.string().nullable().optional(),
        outputDirectory: z.string().nullable().optional(),
        rootDirectory: z.string().nullable().optional(),
        nodeVersion: z.string(),
        directoryListing: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountId: z.string(),
    createdAt: z.number().optional(),
    framework: z.string().optional(),
    buildCommand: z.string().optional(),
    devCommand: z.string().optional(),
    installCommand: z.string().optional(),
    outputDirectory: z.string().optional(),
    rootDirectory: z.string().optional(),
    nodeVersion: z.string(),
    directoryListing: z.boolean().optional()
});

const action = createAction({
    description: 'Create a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            name: string;
            framework?: string | null;
            buildCommand?: string | null;
            devCommand?: string | null;
            installCommand?: string | null;
            outputDirectory?: string | null;
            rootDirectory?: string | null;
        } = {
            name: input.name
        };

        if (input.framework !== undefined) {
            data.framework = input.framework;
        }
        if (input.buildCommand !== undefined) {
            data.buildCommand = input.buildCommand;
        }
        if (input.devCommand !== undefined) {
            data.devCommand = input.devCommand;
        }
        if (input.installCommand !== undefined) {
            data.installCommand = input.installCommand;
        }
        if (input.outputDirectory !== undefined) {
            data.outputDirectory = input.outputDirectory;
        }
        if (input.rootDirectory !== undefined) {
            data.rootDirectory = input.rootDirectory;
        }

        const response = await nango.post({
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#create-a-new-project
            endpoint: '/v9/projects',
            data,
            retries: 10
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Vercel API when creating project.'
            });
        }

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            id: providerProject.id,
            name: providerProject.name,
            accountId: providerProject.accountId,
            nodeVersion: providerProject.nodeVersion,
            ...(providerProject.createdAt !== undefined && { createdAt: providerProject.createdAt }),
            ...(providerProject.framework != null && { framework: providerProject.framework }),
            ...(providerProject.buildCommand != null && { buildCommand: providerProject.buildCommand }),
            ...(providerProject.devCommand != null && { devCommand: providerProject.devCommand }),
            ...(providerProject.installCommand != null && { installCommand: providerProject.installCommand }),
            ...(providerProject.outputDirectory != null && { outputDirectory: providerProject.outputDirectory }),
            ...(providerProject.rootDirectory != null && { rootDirectory: providerProject.rootDirectory }),
            ...(providerProject.directoryListing !== undefined && { directoryListing: providerProject.directoryListing })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
