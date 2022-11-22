export enum STATUS {
    OPEN,
    CLOSED,
};

export interface Lead {
    id: string;
    title: string;
    description: string;
    status: STATUS.OPEN;
    createdAt: string;
    updatedAt: string;
    endAt: string;
}
