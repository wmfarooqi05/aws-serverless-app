import { RECIPIENT_TYPE } from "./models/RecipientEmployeeDetails";
import { IRecipient } from "./models/Recipient";
import { AddressObject, EmailAddress } from "mailparser";
import { IEmployee } from "@models/interfaces/Employees";
import { IContact } from "@models/Contacts";
import Objection from "objection";

/**
 * Extract all emails from AddressObject | AddressObject[]
 * @param list
 * @returns
 */
export const getEmailsFromParsedEmails = (
  list: AddressObject | AddressObject[]
): string[] => {
  if (!list) {
    return [];
  }
  const addressObjects: AddressObject[] = Array.isArray(list) ? list : [list];
  const emails: string[] = [];
  addressObjects?.forEach((add) => {
    add.value?.forEach((e) => {
      emails.push(e.address);
    });
  });
  return emails;
};

/**
 * Get all recipients from mailObject
 * @param addresses
 * @param threadId
 * @param employeeRecords
 * @param contactRecords
 * @returns IRecipient[]
 */
export const getRecipientsFromAddress = (
  addresses: {
    list: AddressObject | AddressObject[];
    type: RECIPIENT_TYPE;
    folderName: string;
  }[],
  threadId: string,
  employeeRecords: IEmployee[],
  contactRecords: IContact[]
): IRecipient[] => {
  const recipients: IRecipient[] = [];
  addresses.forEach((a) => {
    if (a.list) {
      const addressObjects = Array.isArray(a.list) ? a.list : [a.list];
      addressObjects.forEach((x) => {
        recipients.push(
          ...getRecipientsFromAddressList(
            x.value,
            a.type,
            threadId,
            a.folderName,
            employeeRecords,
            contactRecords
          )
        );
      });
    }
  });
  return recipients;
};

/**
 * Make recipients and assign recipientCategory
 * @param addresses
 * @param recipientType
 * @param threadId
 * @param folderName
 * @param employeeRecords
 * @param contactRecords
 * @returns IRecipient[]
 */
const getRecipientsFromAddressList = (
  addresses: EmailAddress[],
  recipientType: RECIPIENT_TYPE,
  threadId: string | null,
  folderName: string,
  employeeRecords: IEmployee[],
  contactRecords: IContact[]
) => {
  if (!addresses.length) {
    return [];
  }

  const recipients: IRecipient[] = [];
  addresses.forEach((x: EmailAddress) => {
    const recipient: IRecipient = {
      recipientType,
      recipientName: x.name,
      recipientEmail: x.address,
      threadId,
      recipientCategory: "OTHERS",
    };

    const employee = employeeRecords.find((e) => e.email === x.address);
    if (employee) {
      recipient.recipientCategory = "EMPLOYEE";
      recipient.recipientEmployeeDetails = {
        folderName,
        isRead: false,
        labels: [],
        employeeId: employee.id,
      };
    } else {
      const contact = contactRecords.find((c) => c.emails.includes(x.address));
      if (contact) {
        recipient.recipientCategory = "COMPANY_CONTACT";
        recipient.recipientCompanyDetails = {
          companyId: contact.companyId,
          contactId: contact.id,
        };
      }
    }
    recipients.push(recipient);
  });

  return recipients;
};

export const convertToEmailAddress = (
  list: { name: string; email: string }[]
): EmailAddress[] =>
  list?.map((x) => ({ name: x.name, address: x.email })) || [];

export const getKeywords = (searchQuery: string): string[] => {
  if (!searchQuery) return [];
  return searchQuery.trim().split(" ");
};

/**
 * @deprecated
 * not working in case of from: email1@gmail.com, email2@gmail.com
 * @param searchQuery
 * @returns
 */
export const parseSearchQuery = (searchQuery: string) => {
  if (!searchQuery) return { keywords: [], filters: {} };
  const keywords = searchQuery.trim().split(" ");
  const filters: any = {};

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    const parts = keyword.split(":");

    if (parts.length === 2) {
      const filterName = parts[0];
      let filterValue = parts[1];

      if (filterValue.startsWith("(") && filterValue.endsWith(")")) {
        filterValue = filterValue.slice(1, -1); // Remove the brackets
      }
      // const filterValue = filterValueStr?.split(",").map((x) => x.trim());

      if (!filters[filterName]) {
        filters[filterName] = [];
      }

      filters[filterName].push(...filterValue.split(",").map((x) => x.trim()));
    }
  }

  return {
    keywords: keywords.filter((keyword) => keyword.indexOf(":") === -1),
    filters,
  };
};

/**
 * It return a where query for words array by apply `ilike` filter on each word
 * @param builder
 * @param keywords
 * @param columns
 */
export const applyWordFilterOnBuilder = (
  builder: Objection.QueryBuilder<any>,
  keywords: string[],
  columns: string[]
) => {
  keywords.forEach((keyword) => {
    columns.forEach((column) =>
      builder.orWhere(column, "ilike", `%${keyword}%`)
    );
  });
};
