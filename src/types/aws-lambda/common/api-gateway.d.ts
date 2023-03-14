
declare global {
  namespace AWSLambda {
    interface APIGatewayEventRequestContextWithAuthorizer {
      employee: any;
    }
  }
}