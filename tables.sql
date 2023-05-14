CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

Drop table companies;
drop table employees;

CREATE TYPE Roles AS ENUM (
	'SALES_REP',
	'SALES_MANAGER',
	'REGIONAL_MANAGER',
	'ADMIN',
	'SUPER_ADMIN');

CREATE TABLE companies_stage (
	id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
	company_name TEXT NOT NULL,
	phone_number TEXT,
	address TEXT,
	city TEXT,
	country TEXT,
	postal_code TEXT,
	contacts JSONB,
	activities JSONB,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
	
	assigned_to uuid,
	assigned_by uuid,
	assignment_history JSONB,
	
  FOREIGN KEY (assigned_to) REFERENCES Employees(id),
  FOREIGN KEY (assigned_by) REFERENCES Employees(id)
);

CREATE TABLE employees_stage (
	id uuid PRIMARY KEY,
	email TEXT,
	name TEXT NOT NULL,
	enabled boolean,
	job_title TEXT,
	role Roles NOT NULL DEFAULT 'SALES_REP',
	address TEXT,
	city TEXT,
	state TEXT,
	country TEXT,
	birthdate DATE,
	email_verified boolean DEFAULT FALSE,
	phone_number_verified boolean DEFAULT FALSE,
	phone_number TEXT,
	settings JSONB,
	social_profiles JSONB,
	EmployeeStatus TEXT,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
	reporting_manager uuid,
		
  FOREIGN KEY (reporting_manager) REFERENCES Employees(id)
);

CREATE TABLE activities_stage (
	id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
	companyId uuid,
	phoneNumber TEXT,
	employeeId uuid,
	reportingManagerId uuid,
	remarks JSONB,
	contactDetails JSONB,
	callDetails JSONB, 
	emailDetails JSONB, 
	created_at TIMESTAMP DEFAULT NOW(), 
	updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
	
	FOREIGN KEY (employeeId) REFERENCES Employees(id),
	FOREIGN KEY (reportingManagerId) REFERENCES Employees(id),
	FOREIGN KEY (companyId) REFERENCES companies(id)
);
