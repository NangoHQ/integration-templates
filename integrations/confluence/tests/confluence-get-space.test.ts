import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-space.js';

describe('confluence get-space tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-space',
        Model: 'ActionOutput_confluence_getspace'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
