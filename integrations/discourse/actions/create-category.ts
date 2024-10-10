import type { NangoAction, ProxyConfiguration, Category, CreateCategory } from '../../models';

export default async function runAction(nango: NangoAction, input: CreateCategory): Promise<Category> {
    if (!input.name) {
        throw new nango.ActionError({
            message: 'Category name is required'
        });
    }

    const config: ProxyConfiguration = {
        endpoint: '/categories',
        retries: 10,
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
