import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-alert-rule.js';

describe('sentry update-alert-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-alert-rule',
        Model: 'ActionOutput_sentry_updatealertrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
