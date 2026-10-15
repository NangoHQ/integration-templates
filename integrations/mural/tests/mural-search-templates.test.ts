import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-templates.js';

describe('mural search-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-templates',
        Model: 'ActionOutput_mural_searchtemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
