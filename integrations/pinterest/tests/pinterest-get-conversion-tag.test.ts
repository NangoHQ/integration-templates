import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-conversion-tag.js';

describe('pinterest get-conversion-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-conversion-tag',
        Model: 'ActionOutput_pinterest_getconversiontag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
