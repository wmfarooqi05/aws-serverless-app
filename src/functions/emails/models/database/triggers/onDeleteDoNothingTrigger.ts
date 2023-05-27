export const onDeleteDoNothing = (tableName: string) => `
CREATE TRIGGER ${tableName}_on_delete
BEFORE DELETE ON ${tableName}
FOR EACH ROW
EXECUTE PROCEDURE do_nothing();
`;
