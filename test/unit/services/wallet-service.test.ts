import * as http from 'http';
import moment from 'moment';
import { Sequelize } from 'sequelize/types';
import * as Repositories from '../../../src/server/db/repositories';
import * as Services from '../../../src/server/services/services';
import { WalletService } from '../../../src/server/services/wallet-service';
import { parseEnvironment } from '../../../src/server/utils/environment-parser';
import { setupDatabase, setUpdatedAt } from '../../e2e/utils/test-utils';
import { createCosigner, defaultCosigner } from '../../e2e/wallet/wallet-test-utils';

const requiredSignatures = 2;
const requiredCosigners = 3;
const daysToSubtract = 7;

describe('transactions should be in order by date', () => {
  let database: Sequelize;
  let walletService: WalletService;
  let pageSize: number;
  let enableSync: boolean;

  beforeAll(async () => {
    const environment = parseEnvironment();
    pageSize = environment.PAGE_SIZE;
    database = await setupDatabase(false);
    walletService = Services.configure(new http.Server(), Repositories.configure(environment, database)).walletService;
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    if (enableSync) await database.sync({ force: true });
  });

  test('return transactions in order by date (ASC)', async () => {
    const walletId = await walletService.createWallet(
      'someName',
      requiredSignatures,
      requiredCosigners,
      defaultCosigner
    );
    await walletService.joinWallet(walletId, createCosigner('secondCosigner'));
    await walletService.joinWallet(walletId, createCosigner('thirdCosigner'));
    const firstTransaction = await walletService.newTransactionProposal(walletId, {
      tx: 'firstTransacation',
      issuer: defaultCosigner.pubKey,
      witness: 'someWitness'
    });

    const secondTransaction = await walletService.newTransactionProposal(walletId, {
      tx: 'secondTransacation',
      issuer: defaultCosigner.pubKey,
      witness: 'someWitness'
    });

    const sevenDaysAgo = moment()
      .subtract(daysToSubtract, 'd')
      .toDate();
    await setUpdatedAt(database, 'transactions', secondTransaction.transactionId, sevenDaysAgo);

    const expectdAmountTransactions = 2;
    const allTransactions = await walletService.getTransactions(walletId);
    expect(allTransactions).toHaveLength(expectdAmountTransactions);
    expect(allTransactions[0].transactionId).toBe(secondTransaction.transactionId);
    expect(allTransactions[1].transactionId).toBe(firstTransaction.transactionId);
  });

  test('return transactions based on from parameter', async () => {
    const walletId = await walletService.createWallet(
      'someName',
      requiredSignatures,
      requiredCosigners,
      defaultCosigner
    );
    await walletService.joinWallet(walletId, createCosigner('secondCosigner'));
    await walletService.joinWallet(walletId, createCosigner('thirdCosigner'));
    const firstTransaction = await walletService.newTransactionProposal(walletId, {
      tx: 'firstTransaction',
      issuer: defaultCosigner.pubKey,
      witness: 'someWitness'
    });

    const secondTransaction = await walletService.newTransactionProposal(walletId, {
      tx: 'secondTransaction',
      issuer: defaultCosigner.pubKey,
      witness: 'someWitness'
    });

    const sevenDaysAgo = moment()
      .subtract(daysToSubtract, 'd')
      .toDate();

    await setUpdatedAt(database, 'transactions', secondTransaction.transactionId, sevenDaysAgo);

    const one = 1;
    const oneDayAgo = moment()
      .subtract(one, 'd')
      .toDate();

    const allTransactions = await walletService.getTransactions(walletId, oneDayAgo.toDateString());
    expect(allTransactions).toHaveLength(1);
    expect(allTransactions[0].transactionId).toBe(firstTransaction.transactionId);
  });

  test('transactions can be paginated using from parameter', async () => {
    const walletId = await walletService.createWallet(
      'someName',
      requiredSignatures,
      requiredCosigners,
      defaultCosigner
    );
    await walletService.joinWallet(walletId, createCosigner('secondCosigner'));
    await walletService.joinWallet(walletId, createCosigner('thirdCosigner'));

    const transactions: Components.Schemas.Transaction[] = [];
    const transactionsToCreate = 30;
    for (let i = 0; i < transactionsToCreate; i++) {
      transactions.push(
        await walletService.newTransactionProposal(walletId, {
          tx: 'someTransaction',
          issuer: defaultCosigner.pubKey,
          witness: 'someWitness'
        })
      );
    }

    const from = transactions[pageSize].updatedAt;
    const lastTransactions = await walletService.getTransactions(walletId, from);
    expect(lastTransactions.length).toBe(transactionsToCreate - pageSize);
  });
});
