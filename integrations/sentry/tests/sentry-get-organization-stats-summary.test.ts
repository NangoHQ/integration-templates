import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-organization-stats-summary.js';

describe('sentry get-organization-stats-summary tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-organization-stats-summary',
        Model: 'ActionOutput_sentry_getorganizationstatssummary'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
