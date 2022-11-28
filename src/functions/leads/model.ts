export interface Lead {
	id?: string;
	company_name: string;
	phone_number?: string;
	address?: string;
	city?: string;
	country?: string;
	postal_code?: string;
	concerned_persons?: JSON;
	remarks?: JSON;
	created_at?: string;
	updated_at?: string;
}

// export lead_public_fields = ['company_name', 'phone_number', 'address', 'city', 'county', ]