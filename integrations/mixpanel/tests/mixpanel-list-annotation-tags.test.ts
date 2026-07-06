import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-annotation-tags.js';

describe('mixpanel list-annotation-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-annotation-tags',
        Model: 'ActionOutput_mixpanel_listannotationtags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
