import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-timeoff-categories.js';

describe('workable list-timeoff-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-timeoff-categories',
        Model: 'ActionOutput_workable_listtimeoffcategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
