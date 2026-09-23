import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-incident-responder-request.js';

describe('pagerduty create-incident-responder-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-incident-responder-request',
        Model: 'ActionOutput_pagerduty_createincidentresponderrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
