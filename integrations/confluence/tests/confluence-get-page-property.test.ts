import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-page-property.js';

describe('confluence get-page-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-page-property',
        Model: 'ActionOutput_confluence_getpageproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
