import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    function_name: z.string().describe('Name of the Postgres function in the public schema. Example: "nango_hello"'),
    args: z.record(z.string(), z.unknown()).optional().describe('Function arguments as a JSON object. Example: {"name": "world"}'),
    read_only: z.boolean().optional().describe('Set to true for read-only functions to use GET (enables caching). Defaults to false (POST).')
});

const ErrorResponseSchema = z.object({
    message: z.string().optional(),
    code: z.string().optional(),
    details: z.string().optional(),
    hint: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    projectUrl: z.string().optional()
});

const OutputSchema = z.unknown();

const action = createAction({
    description: 'Call a Supabase Postgres function via PostgREST.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
        const rawProjectUrl = configParse.success ? configParse.data.projectUrl : undefined;
        const baseUrlOverride = rawProjectUrl ? (rawProjectUrl.startsWith('http') ? rawProjectUrl : `https://${rawProjectUrl}`) : undefined;

        const encodedFunctionName = encodeURIComponent(input.function_name);

        let response;
        if (input.read_only) {
            const getParams: Record<string, string> = {};
            if (input.args) {
                for (const [key, value] of Object.entries(input.args)) {
                    if (value !== undefined && value !== null) {
                        getParams[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    }
                }
            }

            // https://supabase.com/docs/reference/api
            response = await nango.get({
                endpoint: `/rest/v1/rpc/${encodedFunctionName}`,
                params: getParams,
                baseUrlOverride,
                retries: 3
            });
        } else {
            // https://supabase.com/docs/reference/api
            response = await nango.post({
                endpoint: `/rest/v1/rpc/${encodedFunctionName}`,
                data: input.args,
                baseUrlOverride,
                retries: 3
            });
        }

        if (response.status === 404) {
            const errorParse = ErrorResponseSchema.safeParse(response.data);
            if (errorParse.success && errorParse.data.code === 'PGRST202') {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Function "${input.function_name}" was not found in the schema cache. It may not exist or PostgREST may need a refresh.`
                });
            }
        }

        return response.data ?? null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
