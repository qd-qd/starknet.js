import { Contract, Provider, SequencerProvider, stark } from '../src';
import { toBN } from '../src/utils/number';
import {
  compiledErc20,
  describeIfNotDevnet,
  describeIfSequencer,
  getTestProvider,
} from './fixtures';

// Run only if Devnet Sequencer
describeIfSequencer('SequencerProvider', () => {
  let sequencerProvider: SequencerProvider;
  let customSequencerProvider: Provider;
  let exampleContractAddress: string;

  beforeAll(async () => {
    sequencerProvider = getTestProvider() as SequencerProvider;
    customSequencerProvider = new Provider({
      sequencer: {
        baseUrl: 'https://alpha4.starknet.io',
        feederGatewayUrl: 'feeder_gateway',
        gatewayUrl: 'gateway',
      }, // Similar to arguements used in docs
    });
  });

  describe('Gateway specific methods', () => {
    let exampleTransactionHash: string;

    beforeAll(async () => {
      const { transaction_hash, contract_address } = await sequencerProvider.deployContract({
        contract: compiledErc20,
      });
      await sequencerProvider.waitForTransaction(transaction_hash);
      exampleTransactionHash = transaction_hash;
      exampleContractAddress = contract_address;
    });

    test('getTransactionStatus()', async () => {
      return expect(
        sequencerProvider.getTransactionStatus(exampleTransactionHash)
      ).resolves.not.toThrow();
    });

    test('transaction trace', async () => {
      const transactionTrace = await sequencerProvider.getTransactionTrace(exampleTransactionHash);
      // TODO test optional properties
      expect(transactionTrace).toHaveProperty('signature');
    });

    test('getCode() -> { bytecode }', async () => {
      const code = await sequencerProvider.getCode(exampleContractAddress);
      return expect(Array.isArray(code.bytecode)).toBe(true);
    });

    describeIfNotDevnet('which are not available on devnet', () => {
      test('getContractAddresses()', async () => {
        const { GpsStatementVerifier, Starknet } = await sequencerProvider.getContractAddresses();
        expect(typeof GpsStatementVerifier).toBe('string');
        expect(typeof Starknet).toBe('string');
      });
    });
  });

  describe('Test calls with Custom Sequencer Provider', () => {
    let erc20: Contract;
    const wallet = stark.randomAddress();

    beforeAll(async () => {
      const { contract_address, transaction_hash } = await customSequencerProvider.deployContract({
        contract: compiledErc20,
      });

      await customSequencerProvider.waitForTransaction(transaction_hash);
      erc20 = new Contract(compiledErc20.abi, contract_address, customSequencerProvider);
    });

    test('Check ERC20 balance using Custom Sequencer Provider', async () => {
      const result = await erc20.balance_of(wallet);
      const [res] = result;
      expect(res).toStrictEqual(toBN(0));
      expect(res).toStrictEqual(result.res);
    });
  });
});
