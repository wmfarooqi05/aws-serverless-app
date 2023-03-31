//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const createTeam = {
  handler: `${handlerPath(__dirname)}/handler.createTeam`,
  events: [
    {
      http: {
        method: "post",
        path: "team",
        cors: true,
      },
    },
  ],
};

const getTeams = {
  handler: `${handlerPath(__dirname)}/handler.getTeams`,
  events: [
    {
      http: {
        method: "get",
        path: "teams",
        cors: true,
      },
    },
  ],
};

const getTeamById = {
  handler: `${handlerPath(__dirname)}/handler.getTeamById`,
  events: [
    {
      http: {
        method: "get",
        path: "team/{teamId}",
        cors: true,
      },
    },
  ],
};

const updateTeam = {
  handler: `${handlerPath(__dirname)}/handler.updateTeam`,
  events: [
    {
      http: {
        method: "put",
        path: "team/{teamId}",
        cors: true,
      },
    },
  ],
};

const deleteTeam = {
  handler: `${handlerPath(__dirname)}/handler.deleteTeam`,
  events: [
    {
      http: {
        method: "delete",
        path: "team/{teamId}",
        cors: true,
      },
    },
  ],
};

export { getTeams, createTeam, getTeamById, updateTeam, deleteTeam };
