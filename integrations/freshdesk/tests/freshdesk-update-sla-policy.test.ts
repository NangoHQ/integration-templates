import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-sla-policy.js';

describe('freshdesk update-sla-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-sla-policy',
        Model: 'ActionOutput_freshdesk_updateslapolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
