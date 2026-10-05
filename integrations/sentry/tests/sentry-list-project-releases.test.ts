import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-project-releases.js';

describe('sentry list-project-releases tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-project-releases',
        Model: 'ActionOutput_sentry_listprojectreleases'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
