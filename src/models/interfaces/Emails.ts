export type EMAIL_SERVICE_PROVIDER = "GOOGLE" | "AMAZON_SES";

export interface IEmail {
  id: string;
  secondaryId: string;
  body: string;
  sender: {
    id: string;
    name: string;
    teamIds: string[];
    reportingManager: string;
    role: string;
    picture: string;
    jobTitle: string;
  };
  receiver: {
    email: string;
    companyId?: string;
    companyName?: string;
    name?: string;
    personId?: string;
    stage?: string;
  };
  sentDate: string;
  serviceProvider: EMAIL_SERVICE_PROVIDER;
}
