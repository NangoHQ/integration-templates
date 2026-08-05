import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-account-notifications.js';

describe('pipelinecrm list-account-notifications tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-account-notifications',
        Model: 'ActionOutput_pipelinecrm_listaccountnotifications'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
