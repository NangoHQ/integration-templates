import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-page-property.js';

describe('confluence create-page-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-page-property',
        Model: 'ActionOutput_confluence_createpageproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
