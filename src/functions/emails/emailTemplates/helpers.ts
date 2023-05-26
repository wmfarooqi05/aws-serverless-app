import { GetTemplateCommand, SESClient } from "@aws-sdk/client-ses";

export const checkTemplateExists = async (
  templateName: string,
  sesClient: SESClient
): Promise<boolean> => {
  const command = new GetTemplateCommand({ TemplateName: templateName });

  try {
    await sesClient.send(command);
    return true; // Template exists
  } catch (error) {
    if (error.name === "TemplateDoesNotExist") {
      return false; // Template does not exist
    }
    throw error; // Something went wrong
  }
};
