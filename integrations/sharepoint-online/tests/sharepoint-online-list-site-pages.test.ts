import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-site-pages.js';

describe('sharepoint-online list-site-pages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-site-pages',
        Model: 'ActionOutput_sharepoint_online_listsitepages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
