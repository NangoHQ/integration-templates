import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-release-deploys.js';

describe('sentry list-release-deploys tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-release-deploys',
        Model: 'ActionOutput_sentry_listreleasedeploys'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
