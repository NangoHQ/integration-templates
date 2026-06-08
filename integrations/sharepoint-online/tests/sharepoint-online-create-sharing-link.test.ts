import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-sharing-link.js';

describe('sharepoint-online create-sharing-link tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-sharing-link',
        Model: 'ActionOutput_sharepoint_online_createsharinglink'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
