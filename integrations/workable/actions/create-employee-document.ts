import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DocumentSchema = z.object({
    url: z.string().describe('Document URL reachable by Workable servers. Example: "https://example.com/document.pdf"'),
    name: z.string().describe('Document name. Example: "Resume"')
});

const InputSchema = z.object({
    employee_id: z.string().describe('Employee ID. Example: "19ff54"'),
    member_id: z.string().describe('Member ID. Example: "1f395d"'),
    documents: z.array(DocumentSchema).describe('Documents to attach')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Attach a document to an employee record from a hosted URL',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_employees', 'w_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/create-employeedocument
            endpoint: `/spi/v3/employees/${encodeURIComponent(input.employee_id)}/documents`,
            data: {
                member_id: input.member_id,
                documents: input.documents
            },
            retries: 3
        };

        const response = await nango.post(config);

        z.union([z.object({}).passthrough(), z.string().transform(() => ({})), z.null().transform(() => ({}))]).parse(response.data);

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
