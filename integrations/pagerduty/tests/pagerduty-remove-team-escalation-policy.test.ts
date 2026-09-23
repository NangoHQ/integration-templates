import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-team-escalation-policy.js';

describe('pagerduty remove-team-escalation-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-team-escalation-policy',
        Model: 'ActionOutput_pagerduty_removeteamescalationpolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
