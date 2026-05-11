import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-help-center-collections.js';

describe('intercom list-help-center-collections tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-help-center-collections',
        Model: 'ActionOutput_intercom_listhelpcentercollections'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
