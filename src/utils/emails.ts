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
  const pattern = /\{(.+?)\}/g; // Matches anything inside curly braces {}
  const placeholders = templateContent.match(pattern);
  const extractedPlaceholders = placeholders?.map((placeholder) => {
    return placeholder.substring(1, placeholder.length - 1);
  }) || [];
  return extractedPlaceholders;
};
