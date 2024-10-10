import type { NangoSync, ProxyConfiguration, Category } from '../../models';
import type { CategoryResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        endpoint: '/categories'
    };

    const response = await nango.get<CategoryResponse>(config);
    const { categories } = response.data.category_list;

    const createCategories: Category[] = [];
    for (const rawCategory of categories) {
        const category: Category = {
            id: rawCategory.id.toString(),
            name: rawCategory.name,
            description: rawCategory.description,
            color: rawCategory.color,
            slug: rawCategory.slug
        };
        createCategories.push(category);
    }

    await nango.batchSave(createCategories, 'Category');

}

