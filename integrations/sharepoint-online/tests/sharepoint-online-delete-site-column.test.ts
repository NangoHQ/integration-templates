import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-site-column.js';

describe('sharepoint-online delete-site-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-site-column',
        Model: 'ActionOutput_sharepoint_online_deletesitecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
