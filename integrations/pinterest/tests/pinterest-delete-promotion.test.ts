import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-promotion.js';

describe('pinterest delete-promotion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-promotion',
        Model: 'ActionOutput_pinterest_deletepromotion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
