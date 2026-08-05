import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-escalation-policy.js';

describe('datadog create-escalation-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-escalation-policy',
        Model: 'ActionOutput_datadog_createescalationpolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
