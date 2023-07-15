import { CustomError } from "@helpers/custom-error";
import { convert } from "html-to-text";

export const formatRFC2822Message = (
  from: string,
  to: string,
  subject: string,
  date: string,
  messageId: string,
  body: string
) => {
  let message: string = "";
  message += "From: " + from + "\r\n";
  message += "To: " + to + "\r\n";
  message += "Subject: " + subject + "\r\n";
  message += "Date: " + date + "\r\n";
  message += "Message-ID: " + messageId + "\r\n";
  if (isHtml(body)) {
    message += "Content-Type: text/html; charset=utf-8`\r\n";
  }
  message += "\r\n";
  message += body;

  return utf8_to_b64(message);
};

export const utf8_to_b64 = (text) => {
  return Buffer.from(
    String.fromCharCode.apply(null, new TextEncoder().encode(text))
  ).toString("base64");
};

export const isHtml = (str) => {
  const htmlRegex = /<[a-z][\s\S]*>/i;
  return htmlRegex.test(str);
};

export const mergeEmailAndNameList = (
  list: { email: string; name?: string }[]
): string[] => {
  if (!list?.length) return [];
  return list.map((x) => mergeEmailAndName(x));
};

export const mergeEmailAndName = (obj): string => {
  if (obj.name) {
    return `${obj.name} <${obj.email}>`;
  }
  return obj.email;
};

export const splitEmailAndName = (
  emailString: string
): { email: string; name?: string } => {
  const emailRegex = /[\w.-]+@[\w.-]+\.[\w]+/;
  const nameRegex = /(.*)\s<[\w.-]+@[\w.-]+\.[\w]+>/;

  const emailMatch = emailString.match(emailRegex);
  const nameMatch = emailString.match(nameRegex);

  let email, name;

  if (emailMatch) {
    email = emailMatch[0];
  }

  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  return {
    email,
    name,
  };
};

export const getPlaceholders = (templateContent: string | null): string[] => {
  if (!templateContent) return [];
  const pattern = /\{\{(.+?)\}\}/g; // Matches anything inside double curly braces {{}}
  const placeholders = templateContent.match(pattern);
  const extractedPlaceholders =
    placeholders?.map((placeholder) => {
      return placeholder.substring(2, placeholder.length - 2);
    }) || [];
  return extractedPlaceholders;
};

export const validateEmailReferences = (inReplyTo, references) => {
  // Regular expression to match message ID format
  // passing format <message1@domain.com>
  const messageIdRegex = /<([^\s]+)@([^>]+)>/;

  // Check if both values are present and non-empty
  if (!inReplyTo || !references) {
    return;
  }

  // Validate inReplyTo
  if (!messageIdRegex.test(inReplyTo)) {
    throw new CustomError("inReplyTo is not properly formatted", 400);
  }

  // Validate references
  const referencesList = references.split(/\s+/);
  for (const reference of referencesList) {
    if (!messageIdRegex.test(reference)) {
      throw new CustomError("references is not properly formatted", 400);
    }
  }

  // Optionally, check if inReplyTo matches any reference
  if (!referencesList.includes(inReplyTo)) {
    throw new CustomError("inReply is missing in references", 400);
  }

  // All checks passed, the values are valid
  return true;
};

export const extractTextFromHTML = (htmlContent) => {
  const tempElement = document.createElement("div");
  tempElement.innerHTML = htmlContent;
  return tempElement.innerText;
};

export const getContentFromHtml = (
  emailBody: string
): {
  containsHtml: boolean;
  fileContent: { text: string; html: string | null; headers: any };
} => {
  if (isHtml(emailBody)) {
    return {
      containsHtml: true,
      fileContent: {
        text: convert(emailBody, { wordwrap: 160 }),
        html: emailBody,
        headers: {},
      },
    };
  } else {
    return {
      containsHtml: false,
      fileContent: {
        text: convert(emailBody, { wordwrap: 160 }),
        headers: {},
        html: null,
      },
    };
  }
};

export const extractHtmlAndText = (
  emailBody: string
): { containsHtml: boolean; text: string } => {
  const containsHtml = isHtml(emailBody);
  const text = containsHtml ? convert(emailBody, { wordwrap: 160 }) : emailBody;
  return { containsHtml, text };
};
