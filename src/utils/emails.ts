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

export const mergeEmailAndSenderName = (
  list: { email: string; name?: string }[]
): string[] => {
  if (!list?.length) return [];
  return list.map((x) => {
    if (x.name) {
      return `${x.name} <${x.email}>`;
    }
    return x.email;
  });
};
