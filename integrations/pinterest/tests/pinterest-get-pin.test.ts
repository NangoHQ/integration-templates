import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-pin.js';

describe('pinterest get-pin tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-pin',
        Model: 'ActionOutput_pinterest_getpin'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
