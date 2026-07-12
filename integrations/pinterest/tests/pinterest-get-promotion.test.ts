import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-promotion.js';

describe('pinterest get-promotion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-promotion',
        Model: 'ActionOutput_pinterest_getpromotion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
