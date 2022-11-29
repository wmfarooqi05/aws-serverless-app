import { decode } from 'jsonwebtoken'

export const decodeJWTMiddleware = () => {
  return ({
    before: ({ event }) => {
      // @TODO dont send extra things in event.user
      const token = event.headers.Authorization?.split(' ')[1];
      event.user = decode(token);
    }
  })
}
