
declare global {
  namespace AWSLambda {
    interface APIGatewayEventRequestContextWithAuthorizer {
      user: any;
    }
  }
}