import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-escalation-policies.js';

describe('pagerduty list-escalation-policies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-escalation-policies',
        Model: 'ActionOutput_pagerduty_listescalationpolicies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
