import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-site-column.js';

describe('sharepoint-online create-site-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-site-column',
        Model: 'ActionOutput_sharepoint_online_createsitecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
