import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-website-verification-code.js';

describe('pinterest get-website-verification-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-website-verification-code',
        Model: 'ActionOutput_pinterest_getwebsiteverificationcode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
