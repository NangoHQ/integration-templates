import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-alert-rule.js';

describe('sentry create-alert-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-alert-rule',
        Model: 'ActionOutput_sentry_createalertrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
