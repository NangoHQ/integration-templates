import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-alert-rule.js';

describe('sentry delete-alert-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-alert-rule',
        Model: 'ActionOutput_sentry_deletealertrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
