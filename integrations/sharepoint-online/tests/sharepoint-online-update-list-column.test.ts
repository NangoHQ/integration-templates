import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-list-column.js';

describe('sharepoint-online update-list-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-list-column',
        Model: 'ActionOutput_sharepoint_online_updatelistcolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
