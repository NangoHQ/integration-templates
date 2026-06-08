import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-site-column.js';

describe('sharepoint-online update-site-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-site-column',
        Model: 'ActionOutput_sharepoint_online_updatesitecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
