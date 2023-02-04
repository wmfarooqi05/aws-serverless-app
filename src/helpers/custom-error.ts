export interface ICustomErrorArgs {
  statusCode: number;
  message: string;
  data?: any;
  extra?: any;
}
export const CustomErrorArgs = (): ICustomErrorArgs => {
  return {
    message: "",
    statusCode: 0,
  };
};

export class CustomError extends Error implements ICustomErrorArgs {
  statusCode: number;
  data?: any;
  type: string;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);

    Error.captureStackTrace(this, this.constructor);
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}
