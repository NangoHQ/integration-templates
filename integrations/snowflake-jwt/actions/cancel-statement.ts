import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    statement_handle: z
        .string()
        .describe('The statement handle returned by Snowflake when a statement is submitted. Example: "01c4d2c3-0001-e881-001c-d6c3000130ea"')
});

const ProviderCancelResponseSchema = z.object({
    code: z.string(),
    message: z.string()
});

const OutputSchema = z.object({
    code: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Cancel a running Snowflake SQL statement.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // Snowflake's cancel endpoint accepts no request body. Sending
            // `data: {}` with `Content-Type: application/json` triggers a 415
            // because Snowflake interprets the Content-Type header as a
            // declaration that a body is present. Omit both to let Nango issue
            // a bodyless POST, matching the SQL API spec.
            //
            // https://docs.snowflake.com/en/developer-guide/sql-api/submitting-requests#canceling-the-execution-of-a-sql-statement
            endpoint: `/api/v2/statements/${encodeURIComponent(input.statement_handle)}/cancel`,
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderCancelResponseSchema.parse(response.data);

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
