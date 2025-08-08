import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { Category, CreateCategory } from "../models.js";

const action = createAction({
    description: "Create a category in discourse",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/categories",
        group: "Categories"
    },

    input: CreateCategory,
    output: Category,

    exec: async (nango, input): Promise<Category> => {
        if (!input.name) {
            throw new nango.ActionError({
                message: 'Category name is required'
            });
        }

        const config: ProxyConfiguration = {
            // https://docs.discourse.org/#tag/Categories/operation/createCategory
            endpoint: '/categories',
            retries: 3,
            data: input
        };

        const { data } = await nango.post<{ category: Category }>(config);

        const category: Category = {
            id: data.category.id,
            name: data.category.name,
            description: data.category.description,
            color: data.category.color,
            slug: data.category.slug
        };

        return category;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
