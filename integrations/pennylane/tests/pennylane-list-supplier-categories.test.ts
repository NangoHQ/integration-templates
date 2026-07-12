import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-supplier-categories.js';

describe('pennylane list-supplier-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-supplier-categories',
        Model: 'ActionOutput_pennylane_listsuppliercategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
