import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-category-group-categories.js';

describe('pennylane list-category-group-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-category-group-categories',
        Model: 'ActionOutput_pennylane_listcategorygroupcategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
