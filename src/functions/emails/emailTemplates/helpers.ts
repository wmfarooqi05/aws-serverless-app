import { GetTemplateCommand, SESClient } from "@aws-sdk/client-ses";

export const checkTemplateExistsOnSES = async (
  templateName: string,
  sesClient: SESClient
): Promise<boolean> => {
  const command = new GetTemplateCommand({ TemplateName: templateName });

  try {
    await sesClient.send(command);
    return true; // Template exists
  } catch (error) {
    if (error.name === "TemplateDoesNotExistException") {
      return false; // Template does not exist
    }
    throw error; // Something went wrong
  }
};
