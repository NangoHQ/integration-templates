import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-service-integration.js';

describe('pagerduty get-service-integration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-service-integration',
        Model: 'ActionOutput_pagerduty_getserviceintegration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
