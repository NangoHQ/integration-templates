import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/share-meeting.js';

describe('fireflies share-meeting tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'share-meeting',
        Model: 'ActionOutput_fireflies_sharemeeting'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
