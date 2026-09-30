import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-organization-event-counts.js';

describe('sentry get-organization-event-counts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-organization-event-counts',
        Model: 'ActionOutput_sentry_getorganizationeventcounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
