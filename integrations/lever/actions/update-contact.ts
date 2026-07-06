import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Contact ID. Example: "997fd432-94f6-4613-9fa8-c3d5bd49600b"'),
    name: z.string().optional().describe('Contact name.'),
    emails: z.array(z.string()).optional().describe('Contact email addresses.'),
    phones: z
        .array(
            z.object({
                value: z.string(),
                type: z.string().optional()
            })
        )
        .optional()
        .describe('Contact phone numbers.')
});

const ProviderContactSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        emails: z
            .array(
                z.union([
                    z.string(),
                    z
                        .object({
                            value: z.string(),
                            type: z.string().nullable().optional()
                        })
                        .passthrough()
                ])
            )
            .nullable()
            .optional(),
        phones: z
            .array(
                z.union([
                    z.string(),
                    z
                        .object({
                            value: z.string(),
                            type: z.string().nullable().optional()
                        })
                        .passthrough()
                ])
            )
            .nullable()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    emails: z
        .array(
            z.object({
                value: z.string(),
                type: z.string().optional()
            })
        )
        .optional(),
    phones: z
        .array(
            z.object({
                value: z.string(),
                type: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: "Update a contact's emails, phones, or other person-level fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.emails !== undefined) {
            body['emails'] = input.emails;
        }
        if (input.phones !== undefined) {
            body['phones'] = input.phones;
        }

        const response = await nango.put({
            // https://hire.lever.co/developer/documentation#update-a-contact
            endpoint: `/v1/contacts/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const providerContact = ProviderContactSchema.parse(response.data.data);

        return {
            id: providerContact.id,
            ...(providerContact.name != null && { name: providerContact.name }),
            ...(providerContact.emails != null && {
                emails: providerContact.emails.map((email) => {
                    if (typeof email === 'string') {
                        return { value: email };
                    }
                    return {
                        value: email.value,
                        ...(email.type != null && { type: email.type })
                    };
                })
            }),
            ...(providerContact.phones != null && {
                phones: providerContact.phones.map((phone) => {
                    if (typeof phone === 'string') {
                        return { value: phone };
                    }
                    return {
                        value: phone.value,
                        ...(phone.type != null && { type: phone.type })
                    };
                })
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
