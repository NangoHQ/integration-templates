import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-business-service.js';

describe('pagerduty create-business-service tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-business-service',
        Model: 'ActionOutput_pagerduty_createbusinessservice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
