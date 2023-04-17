export const onUpdateTrigger = (tableName: string) => `
CREATE TRIGGER ${tableName}_updated_at
BEFORE UPDATE ON ${tableName}
FOR EACH ROW
EXECUTE PROCEDURE on_update_timestamp();
`;
