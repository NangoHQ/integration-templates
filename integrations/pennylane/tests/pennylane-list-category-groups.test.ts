import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-category-groups.js';

describe('pennylane list-category-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-category-groups',
        Model: 'ActionOutput_pennylane_listcategorygroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
