import {
  DataTypes,
  Sequelize,
  Model,
  HasManyGetAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  Association,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  HasManyAddAssociationMixin,
  HasManyHasAssociationMixin
} from 'sequelize';
import { PubKey, TransactionState, WalletId } from '../models';
import Cosigner from './cosigner';

import Signature from './signature';
import Wallet from './wallet';

interface TransactionAttributes {
  id: string;
  unsignedTransaction: string;
}

type TransactionAttributesCreation = TransactionAttributes;

class Transaction extends Model<TransactionAttributes, TransactionAttributesCreation> implements TransactionAttributes {
  public id!: string;
  public unsignedTransaction!: string;

  public readonly wallet!: Wallet;
  public readonly issuer!: Cosigner;
  public readonly signatures!: Signature[];

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getSignatures!: HasManyGetAssociationsMixin<Signature>;
  public countSignatures!: HasManyCountAssociationsMixin;
  public createSignature!: HasManyCreateAssociationMixin<Signature>;
  public addSignature!: HasManyAddAssociationMixin<Signature, PubKey>;
  public hasSignature!: HasManyHasAssociationMixin<Signature, PubKey>;

  public getIssuer!: BelongsToGetAssociationMixin<Cosigner>;
  public setIssuer!: BelongsToSetAssociationMixin<Cosigner, PubKey>;

  public getWallet!: BelongsToGetAssociationMixin<Wallet>;
  public setWallet!: BelongsToSetAssociationMixin<Wallet, WalletId>;

  public static associations: {
    wallet: Association<Transaction, Wallet>;
    issuer: Association<Transaction, Cosigner>;
    signatures: Association<Transaction, Signature>;
  };

  public async getState(): Promise<TransactionState> {
    const countSignatures = await this.countSignatures();
    const requiredSignatures = (await this.getWallet()).m;
    return countSignatures >= requiredSignatures ? 'Signed' : 'WaitingForSignatures';
  }

  public async toDTO(): Promise<Components.Responses.TransactionProposal> {
    return {
      transactionId: this.id,
      transactionState: await this.getState(),
      createdAt: this.createdAt.toDateString(),
      updatedAt: this.updatedAt.toDateString(),
      unsignedTransaction: this.unsignedTransaction
    };
  }

  public static initialize(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true
        },
        unsignedTransaction: {
          type: DataTypes.STRING,
          allowNull: false
        }
      },
      {
        sequelize,
        tableName: 'transactions',
        timestamps: true
      }
    );
  }

  public static defineRelations(): void {
    this.hasMany(Signature, {
      as: 'signatures',
      foreignKey: 'transactionId'
    });

    this.belongsTo(Cosigner, {
      as: 'issuer'
    });

    this.belongsTo(Wallet, {
      as: 'wallet',
      foreignKey: 'walletId'
    });
  }
}

export default Transaction;