import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-media-comments.js';

describe('instagram list-media-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-media-comments',
        Model: 'ActionOutput_instagram_listmediacomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
