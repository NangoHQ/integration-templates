import { createAction } from "nango";
import type { Field, ListField, Option } from '../types.js';

import { Anonymous_bamboohrbasic_action_fetchfields_output, BamboohrField, Option } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Introspection to retrieve available fields",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/fields"
    },

    input: z.void(),
    output: Anonymous_bamboohrbasic_action_fetchfields_output,

    exec: async (nango): Promise<Anonymous_bamboohrbasic_action_fetchfields_output> => {
        const response = await nango.get<Field[]>({
            endpoint: '/v1/meta/fields',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const { data } = response;

        const listFieldResponse = await nango.get<ListField[]>({
            endpoint: '/v1/meta/lists',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const { data: listData } = listFieldResponse;

        const fields = mapFields({ fields: data, listData });

        return fields;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function mapFields({ fields, listData }: { fields: Field[]; listData: ListField[] }): BamboohrField[] {
    const mappedFields: BamboohrField[] = [];
    const basicFields = fields.filter((field) => field.alias && field.id && !String(field.id).includes('.'));

    for (const field of basicFields) {
        const listField = listData.find((list) => list.fieldId === field.id);
        const mappedField: BamboohrField = {
            id: String(field.id),
            name: field.name,
            type: field.type
        };

        if (field.alias) {
            mappedField.alias = field.alias;
        }

        if (listField) {
            mappedField.options = listField.options.map((option: Option) => {
                return {
                    id: option.id,
                    name: option.name
                };
            });
        }

        mappedFields.push(mappedField);
    }

    return mappedFields;
}
