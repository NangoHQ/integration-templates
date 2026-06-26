import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contents.js';

describe('exa get-contents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contents',
        Model: 'ActionOutput_exa_getcontents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
