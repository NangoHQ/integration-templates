import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-bid-floors.js';

describe('pinterest get-bid-floors tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-bid-floors',
        Model: 'ActionOutput_pinterest_getbidfloors'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
