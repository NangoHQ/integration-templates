import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-project-environments.js';

describe('sentry list-project-environments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-project-environments',
        Model: 'ActionOutput_sentry_listprojectenvironments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
