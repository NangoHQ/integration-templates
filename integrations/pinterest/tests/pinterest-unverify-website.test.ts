import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unverify-website.js';

describe('pinterest unverify-website tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unverify-website',
        Model: 'ActionOutput_pinterest_unverifywebsite'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
