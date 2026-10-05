import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-project-keys.js';

describe('sentry list-project-keys tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-project-keys',
        Model: 'ActionOutput_sentry_listprojectkeys'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
