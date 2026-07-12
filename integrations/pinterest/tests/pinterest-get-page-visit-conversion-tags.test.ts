import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-page-visit-conversion-tags.js';

describe('pinterest get-page-visit-conversion-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-page-visit-conversion-tags',
        Model: 'ActionOutput_pinterest_getpagevisitconversiontags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
