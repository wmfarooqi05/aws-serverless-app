// const AWS = require("aws-sdk");

// // Set up the AWS SDK
// AWS.config.update({ region: process.env.REGION });

// // Create a new instance of the WebSocket API
// const apiGateway = new AWS.ApiGatewayManagementApi({
//   apiVersion: "2018-11-29",
//   endpoint: `https://${process.env.APIG_WS_API_ID}.execute-api.us-west-2.amazonaws.com/${process.env.STAGE}`,
// });

// // Send a message to a specific connection
// const sendMessage = async (connectionId, data) => {
//   try {
//     await apiGateway
//       .postToConnection({ ConnectionId: connectionId, Data: data })
//       .promise();
//   } catch (e) {
//     console.error(e);
//   }
// };
