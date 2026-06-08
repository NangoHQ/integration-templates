import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-drive-item-versions.js';

describe('sharepoint-online list-drive-item-versions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-drive-item-versions',
        Model: 'ActionOutput_sharepoint_online_listdriveitemversions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
