import { handlerPath } from '@libs/handler-resolver';

const authCallback = {
  handler: `${handlerPath(__dirname)}/handler.callback`,
  events: [
    {
      httpApi: 'POST /auth/callback',
    }
  ],
};

export { authCallback };
