import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the global variable. Unique across Synthetic global variables. Example: "MY_VARIABLE"'),
    description: z.string().describe('Description of the global variable. Example: "Example description"'),
    tags: z.array(z.string()).describe('Tags of the global variable. Example: ["team:front", "test:workflow-1"]'),
    value: z.string().optional().describe('Value of the global variable. Omit when using parse_test_public_id to generate the value from a test.'),
    secure: z.boolean().optional().describe('Determines if the value of the variable is hidden.'),
    is_totp: z.boolean().optional().describe('Determines if the global variable is a TOTP/MFA variable.'),
    is_fido: z.boolean().optional().describe('Determines if the global variable is a FIDO variable.'),
    parse_test_public_id: z.string().optional().describe('A Synthetic test ID to use as a test to generate the variable value. Example: "abc-def-123"'),
    parse_test_options_type: z
        .enum(['http_body', 'http_header', 'http_status_code', 'local_variable'])
        .optional()
        .describe('Type of value to extract from a test.'),
    parse_test_options_field: z
        .string()
        .optional()
        .describe('When type is http_header, name of the header to use to extract the value. Example: "content-type"'),
    parse_test_options_local_variable_name: z
        .string()
        .optional()
        .describe('When type is local_variable, name of the local variable to use to extract the value. Example: "LOCAL_VARIABLE"'),
    parse_test_options_parser_type: z.enum(['raw', 'json_path', 'regex', 'x_path']).optional().describe('Type of parser to use for extracting the value.'),
    parse_test_options_parser_value: z.string().optional().describe('Regex or JSON path used for the parser. Not used with type raw.'),
    restricted_roles: z
        .array(z.string())
        .optional()
        .describe('A list of role identifiers that can be pulled from the Roles API, for restricting read and write access. This field is deprecated.')
});

const ProviderGlobalVariableSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    value: z
        .object({
            secure: z.boolean().optional(),
            value: z.string().optional()
        })
        .optional(),
    is_totp: z.boolean().optional(),
    is_fido: z.boolean().optional(),
    parse_test_public_id: z.string().optional(),
    parse_test_options: z
        .object({
            type: z.string(),
            field: z.string().optional(),
            localVariableName: z.string().optional(),
            parser: z
                .object({
                    type: z.string(),
                    value: z.string().optional()
                })
                .optional()
        })
        .optional(),
    attributes: z
        .object({
            restricted_roles: z.array(z.string()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    value: z
        .object({
            secure: z.boolean().optional(),
            value: z.string().optional()
        })
        .optional(),
    is_totp: z.boolean().optional(),
    is_fido: z.boolean().optional(),
    parse_test_public_id: z.string().optional(),
    parse_test_options: z
        .object({
            type: z.string(),
            field: z.string().optional(),
            localVariableName: z.string().optional(),
            parser: z
                .object({
                    type: z.string(),
                    value: z.string().optional()
                })
                .optional()
        })
        .optional(),
    attributes: z
        .object({
            restricted_roles: z.array(z.string()).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a reusable global variable for use across Synthetic tests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['synthetics_global_variable_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            name: input.name,
            description: input.description,
            tags: input.tags,
            ...(input.value !== undefined || input.secure !== undefined
                ? {
                      value: {
                          ...(input.value !== undefined && { value: input.value }),
                          ...(input.secure !== undefined && { secure: input.secure })
                      }
                  }
                : {}),
            ...(input.is_totp !== undefined && { is_totp: input.is_totp }),
            ...(input.is_fido !== undefined && { is_fido: input.is_fido }),
            ...(input.parse_test_public_id !== undefined && { parse_test_public_id: input.parse_test_public_id }),
            ...(input.parse_test_options_type !== undefined && {
                parse_test_options: {
                    type: input.parse_test_options_type,
                    ...(input.parse_test_options_field !== undefined && { field: input.parse_test_options_field }),
                    ...(input.parse_test_options_local_variable_name !== undefined && { localVariableName: input.parse_test_options_local_variable_name }),
                    ...(input.parse_test_options_parser_type !== undefined && {
                        parser: {
                            type: input.parse_test_options_parser_type,
                            ...(input.parse_test_options_parser_value !== undefined && { value: input.parse_test_options_parser_value })
                        }
                    })
                }
            }),
            ...(input.restricted_roles !== undefined && {
                attributes: {
                    restricted_roles: input.restricted_roles
                }
            })
        };

        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/synthetics/#create-a-global-variable
            endpoint: 'v1/synthetics/variables',
            data,
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Datadog API returned an empty response when creating the synthetic global variable.'
            });
        }

        const providerVariable = ProviderGlobalVariableSchema.parse(response.data);

        return {
            id: providerVariable.id,
            name: providerVariable.name,
            description: providerVariable.description,
            tags: providerVariable.tags,
            ...(providerVariable.value !== undefined && {
                value: {
                    ...(providerVariable.value.secure !== undefined && { secure: providerVariable.value.secure }),
                    ...(providerVariable.value.value !== undefined && { value: providerVariable.value.value })
                }
            }),
            ...(providerVariable.is_totp !== undefined && { is_totp: providerVariable.is_totp }),
            ...(providerVariable.is_fido !== undefined && { is_fido: providerVariable.is_fido }),
            ...(providerVariable.parse_test_public_id !== undefined && { parse_test_public_id: providerVariable.parse_test_public_id }),
            ...(providerVariable.parse_test_options !== undefined && {
                parse_test_options: {
                    type: providerVariable.parse_test_options.type,
                    ...(providerVariable.parse_test_options.field !== undefined && { field: providerVariable.parse_test_options.field }),
                    ...(providerVariable.parse_test_options.localVariableName !== undefined && {
                        localVariableName: providerVariable.parse_test_options.localVariableName
                    }),
                    ...(providerVariable.parse_test_options.parser !== undefined && {
                        parser: {
                            type: providerVariable.parse_test_options.parser.type,
                            ...(providerVariable.parse_test_options.parser.value !== undefined && { value: providerVariable.parse_test_options.parser.value })
                        }
                    })
                }
            }),
            ...(providerVariable.attributes !== undefined && {
                attributes: {
                    ...(providerVariable.attributes.restricted_roles !== undefined && { restricted_roles: providerVariable.attributes.restricted_roles })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
