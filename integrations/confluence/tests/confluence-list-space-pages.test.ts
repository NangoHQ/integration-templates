import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-space-pages.js';

describe('confluence list-space-pages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-space-pages',
        Model: 'ActionOutput_confluence_listspacepages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
