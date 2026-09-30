import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-release-commits.js';

describe('sentry list-release-commits tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-release-commits',
        Model: 'ActionOutput_sentry_listreleasecommits'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
