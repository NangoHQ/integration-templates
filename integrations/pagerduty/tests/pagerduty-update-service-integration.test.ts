import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-service-integration.js';

describe('pagerduty update-service-integration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-service-integration',
        Model: 'ActionOutput_pagerduty_updateserviceintegration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
