import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The Figma file key. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    node_id: z.string().describe('The ID of the node to retrieve. Example: "91:1"')
});

const ComponentSchema = z.object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    componentSetId: z.string().optional(),
    documentationLinks: z.array(z.object({ uri: z.string() })),
    remote: z.boolean()
});

const ComponentSetSchema = z.object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    documentationLinks: z.array(z.object({ uri: z.string() })),
    remote: z.boolean()
});

const StyleSchema = z.object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    remote: z.boolean(),
    styleType: z.string()
});

const OutputSchema = z.object({
    document: z.record(z.string(), z.unknown()).describe('The requested node as a JSON object'),
    components: z.record(z.string(), ComponentSchema).describe('A mapping from component IDs to component metadata'),
    componentSets: z.record(z.string(), ComponentSetSchema).describe('A mapping from component set IDs to component set metadata'),
    schemaVersion: z.number().describe('The version of the file schema that this file uses'),
    styles: z.record(z.string(), StyleSchema).describe('A mapping from style IDs to style metadata')
});

const action = createAction({
    description: 'Retrieve a single file node from Figma',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_content:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.figma.com/developers/api#get-file-nodes-endpoint
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/nodes`,
            params: {
                ids: input.node_id
            },
            retries: 3
        });

        const responseData = z
            .object({
                name: z.string(),
                role: z.string(),
                lastModified: z.string(),
                editorType: z.string(),
                thumbnailUrl: z.string(),
                version: z.string(),
                nodes: z.record(z.string(), z.unknown())
            })
            .parse(response.data);

        const nodeEntry = responseData.nodes[input.node_id];

        if (!nodeEntry) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Node "${input.node_id}" not found in file "${input.file_key}"`
            });
        }

        const validatedNodeEntry = z
            .object({
                document: z.record(z.string(), z.unknown()),
                components: z.record(z.string(), ComponentSchema).optional().default({}),
                componentSets: z.record(z.string(), ComponentSetSchema).optional().default({}),
                schemaVersion: z.number().optional().default(0),
                styles: z.record(z.string(), StyleSchema).optional().default({})
            })
            .parse(nodeEntry);

        return {
            document: validatedNodeEntry.document,
            components: validatedNodeEntry.components,
            componentSets: validatedNodeEntry.componentSets,
            schemaVersion: validatedNodeEntry.schemaVersion,
            styles: validatedNodeEntry.styles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
