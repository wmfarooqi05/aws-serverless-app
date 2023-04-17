import { Knex } from "knex";

const ON_DELETE_DO_NOTHING = `
CREATE OR REPLACE FUNCTION do_nothing()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
`;

const DROP_ON_DELETE_DO_NOTHING = `DROP FUNCTION do_nothing`;

export async function up(knex: Knex): Promise<void> {
  await knex.raw(ON_DELETE_DO_NOTHING);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(DROP_ON_DELETE_DO_NOTHING);
}
