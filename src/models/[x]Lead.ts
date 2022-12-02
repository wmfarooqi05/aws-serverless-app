import * as Sequelize from 'sequelize'
import sequelizeConnection from '../config';

interface ILeadModel {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export const LeadModel = sequelizeConnection.define('leads', {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Date.now(),
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Date.now(),
  },
})