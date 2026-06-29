import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pages.js';

describe('coda list-pages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pages',
        Model: 'ActionOutput_coda_listpages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
