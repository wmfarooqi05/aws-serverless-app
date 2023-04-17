// Only adder can modify notes
// Manager can delete
export interface INotes {
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
  emailList: string[];
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
  createdBy?: string;
  concernedPersons?: IConcernedPerson[];
  addresses?: IAddress[];
  assignedTo?: string;
  assignedBy?: string;
  assignmentHistory?: JSON;
  priority: COMPANY_PRIORITY;
  taskStatus: COMPANY_STATUS;
  stage: COMPANY_STAGES;
  updatedAt?: string;
  notes?: INotes[];
}

export enum COMPANY_STAGES {
  LEAD = "LEAD",
  CONTACT = "CONTACT", // maybe contact or client
}

export enum COMPANY_STATUS {
  NONE = "NONE",
  ATTEMPTED_TO_CONTACT = "ATTEMPTED_TO_CONTACT",
  CONTACT_IN_FUTURE = "CONTACT_IN_FUTURE",
  CONTACTED = "CONTACTED",
  JUNK_LEAD = "JUNK_LEAD",
  LOST_LEAD = "LOST_LEAD",
  NOT_CONTACTED = "NOT_CONTACTED",
  DO_NOT_CALL = "DO_NOT_CALL",
}

// we have to manage status and priorities by teams
// do not email me
//

export enum COMPANY_PRIORITY {
  NO_PRIORITY = "NO_PRIORITY",
  LOWEST = "LOWEST",
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  HIGHEST = "HIGHEST",
}