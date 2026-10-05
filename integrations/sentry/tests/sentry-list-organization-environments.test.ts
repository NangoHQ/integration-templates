import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-organization-environments.js';

describe('sentry list-organization-environments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-organization-environments',
        Model: 'ActionOutput_sentry_listorganizationenvironments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
