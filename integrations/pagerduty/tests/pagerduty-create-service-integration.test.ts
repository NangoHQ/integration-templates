import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-service-integration.js';

describe('pagerduty create-service-integration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-service-integration',
        Model: 'ActionOutput_pagerduty_createserviceintegration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
