// Only adder can modify notes
// Manager can delete
interface INotes {
  id: string;
  addedBy: string;
  updatedAt: string;
  isEdited: boolean;
  notesText: string;
}

