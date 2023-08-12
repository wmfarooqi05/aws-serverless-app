import { corsHeaders } from "@libs/api-gateway";

export const expressInputParseMiddleware = (req, _, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString();
  } else if (typeof req.body === "string") {
    req.body = JSON.parse(req.body);
  }
  // Do something with the request, such as logging or modifying headers
  next(); // Call the next middleware or route handler
};

export const expressResponseHelper = (res, apiResponse) => {
  res
    .status(apiResponse.statusCode || 200)
    .set({ ...apiResponse?.headers, ...corsHeaders() })
    .set("Content-Type", "application/json")
    .send(apiResponse.body);
};
