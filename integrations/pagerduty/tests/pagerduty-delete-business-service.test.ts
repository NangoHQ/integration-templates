import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-business-service.js';

describe('pagerduty delete-business-service tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-business-service',
        Model: 'ActionOutput_pagerduty_deletebusinessservice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
