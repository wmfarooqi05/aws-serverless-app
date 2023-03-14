// Only adder can modify notes
// Manager can delete
interface INotes {
  id: string;
  addedBy: string;
  updatedAt: string;
  isEdited: boolean;
  notesText: string;
}

export interface IAssignmentHistory {
  assignedTo?: string;
  assignedBy: string;
  comments?: string;
  date: string;
}

export interface IConcernedPerson {
  id: string;
  name: string;
  designation: string;
  phoneNumbers: string[];
  emails: string[];
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAddress {
  title: string;
  address: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface ICompany {
  id?: string;
  companyName: string;
  addresses?: IAddress[];
  concernedPersons?: IConcernedPerson[];
  assignedTo?: string;
  assignedBy?: string;
  assignmentHistory?: JSON;
  updatedAt?: string;
  notes?: INotes[];
  createdBy?: string;
}

export enum COMPANY_STAGES {
  LEAD = "LEAD",
  PROSPECT = "PROSPECT",
  OPPORTUNITY = "OPPORTUNITY", // maybe contact or client
}

export enum TASK_STATUS {
  ICEBOX = "ICEBOX",
  BACK_LOG = "BACK_LOG",
  TO_DO = "TO_DO",
  DELAYED_BY_CLIENT = "DELAYED_BY_CLIENT",
  DELAYED_BY_MANAGER = "DELAYED_BY_MANAGER",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  BLOCKED = "BLOCKED",
  WONT_DO = "WONT_DO",
  NOT_VALID = "NOT_VALID", // @TODO improve
  DONE = "DONE",
}

// @TODO v2: Move this to a separate table
export enum PRIORITY {
  NO_PRIORITY = "NO_PRIORITY",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRUCIAL = "CRUCIAL",
}
