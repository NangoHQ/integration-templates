import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-site-columns.js';

describe('sharepoint-online list-site-columns tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-site-columns',
        Model: 'ActionOutput_sharepoint_online_listsitecolumns'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
