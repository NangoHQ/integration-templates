import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-thread.js';

describe('google-mail get-thread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-thread',
        Model: 'ActionOutput_google_mail_getthread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('sends each metadataHeaders value as its own query param', async () => {
        // @ts-expect-error - stubbing one response to inspect the request
        nangoMock.get.mockResolvedValueOnce({ data: { id: 'thread-1' } });

        await createAction.exec(nangoMock, { id: 'thread-1', format: 'metadata', metadataHeaders: ['From', 'Subject'] });

        expect(nangoMock.get).toHaveBeenLastCalledWith(expect.objectContaining({ params: 'format=metadata&metadataHeaders=From&metadataHeaders=Subject' }));
    });
});
