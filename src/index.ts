/* eslint-disable @typescript-eslint/no-throw-literal */
import {
  WalletName,
  BaseWalletAdapter,
  NetworkInfo,
  AccountKeys,
  SignMessagePayload,
  SignMessageResponse,
  WalletAdapterNetwork,
  WalletReadyState
} from '@aptstats/aptos-wallet-framework';
import { PendingTransaction, TransactionPayload } from 'aptos/src/generated';
import { nightlyIcon } from './icon';
import { AptosPublicKey } from './aptos_public_key';
import { Types } from 'aptos';

interface AptosNightly {
  publicKey: AptosPublicKey;
  onAccountChange: (pubKey?: string) => void;
  connect(onDisconnect?: () => void, eagerConnect?: boolean): Promise<AptosPublicKey>;
  disconnect(): Promise<void>;
  signTransaction: (
    transaction: TransactionPayload,
    submit: boolean
  ) => Promise<Uint8Array | PendingTransaction>;
  signAllTransactions: (transaction: TransactionPayload[]) => Promise<Uint8Array[]>;
  signMessage(msg: string): Promise<Uint8Array>;
  network(): Promise<{ api: string; chainId: number; network: string }>;
}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type AccountInfo = PartialBy<AccountKeys, 'authKey'>;

interface NightlyWindow extends Window {
  nightly?: {
    aptos: AptosNightly;
  };
}

declare const window: NightlyWindow; // CHANGE AptosWindow

export const NightlyWalletName = 'Nightly' as WalletName<'Nightly'>; // CHANGE AptosWalletName, CHANGE "Aptos"

// CHANGE AptosWallet
export class NightlyWallet extends BaseWalletAdapter {
  get readyState(): WalletReadyState {
    throw new Error('Method not implemented.');
  }

  get publicAccount(): AccountKeys {
    return {
      publicKey: this._wallet?.publicKey || null,
      address: this._wallet?.address || null,
      authKey: this._wallet?.authKey || null
    };
  }

  get connecting(): boolean {
    return this._connecting;
  }

  readonly name = NightlyWalletName; // CHANGE AptosWalletName (can have capitalization)

  readonly url = // CHANGE url value
    'https://chrome.google.com/webstore/detail/nightly/fiikommddbeccaoicoejoniammnalkfa';

  readonly icon = nightlyIcon;

  // An optional property for wallets which may have different wallet name with window property name.
  // such as window.aptosWallet and wallet name is Aptos.
  // If your wallet name prop is different than the window property name use the window property name here and comment out line 37

  readonly providerName = 'nightly';

  private _wallet: AccountInfo = null;

  private _network: NetworkInfo = null;

  private _connecting: boolean = false;

  provider: { aptos: AptosNightly } | undefined =
    typeof window !== 'undefined' && window.nightly ? window.nightly : undefined; // CHANGE window.aptos

  async connect(): Promise<void> {
    try {
      this._connecting = true;
      const accountInfo = await this.provider?.aptos.connect();
      if (!accountInfo) throw `${NightlyWalletName} Address Info Error`;
      this._wallet = {
        address: accountInfo.address(),
        publicKey: accountInfo.asString()
      };

      if (this._wallet) {
        try {
          const networkInfo = await this.provider?.aptos.network();
          this._network = {
            api: networkInfo.api,
            name: networkInfo.network as WalletAdapterNetwork,
            chainId: networkInfo.chainId + ''
          };
        } catch (error: any) {
          throw error;
        }
      }
    } catch (error: any) {
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async account(): Promise<AccountInfo> {
    const response = await this.provider?.aptos.publicKey;
    if (!response) throw `${NightlyWalletName} Account Error`;
    return {
      address: response.address(),
      publicKey: response.asString()
    };
  }

  async disconnect(): Promise<void> {
    try {
      await this.provider?.aptos.disconnect();
    } catch (error: any) {
      throw error;
    }
  }

  async signTransaction(
    transactionPyld: Types.TransactionPayload,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: any
  ): Promise<Uint8Array> {
    try {
      const response = await this.provider?.aptos.signTransaction(transactionPyld, false);
      if (!response) throw `${NightlyWalletName} signAndSubmitTransaction Error`;
      return response as Uint8Array;
    } catch (error: any) {
      const errMsg = error.message;
      throw errMsg;
    }
  }

  async signAndSubmitTransaction(
    transaction: Types.TransactionPayload,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: any
  ): Promise<{ hash: Types.HexEncodedBytes }> {
    try {
      const response = await this.provider?.aptos.signTransaction(transaction, true);
      if (!response) throw `${NightlyWalletName} signAndSubmitTransaction Error`;
      return { hash: (response as unknown as PendingTransaction).hash };
    } catch (error: any) {
      const errMsg = error.message;
      throw errMsg;
    }
  }

  // SignMessageResponse {
  //   address: string;
  //   application: string;
  //   chainId: number;
  //   fullMessage: string; // The message that was generated to sign
  //   message: string; // The message passed in by the user
  //   nonce: string;
  //   prefix: string; // Should always be APTOS
  //   signature: string; // The signed full message
  // }

  async signMessage(message: SignMessagePayload): Promise<SignMessageResponse> {
    try {
      if (typeof message !== 'object' || !message.nonce) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        `${NightlyWalletName} Invalid signMessage Payload`;
      }
      // TODO: use nonce and prefix
      const response = await this.provider?.aptos.signMessage(message.message);
      if (response) {
        return {
          address: this._wallet.address as string,
          application: '',
          chainId: (await this.provider.aptos.network()).chainId,
          fullMessage: message.message,
          signature: response.toString(),
          message: message.message,
          nonce: message.nonce,
          prefix: 'APTOS'
        };
      } else {
        throw `${NightlyWalletName} Sign Message failed`;
      }
    } catch (error: any) {
      const errMsg = error.message;
      throw errMsg;
    }
  }

  get network(): NetworkInfo {
    return this._network;
  }

  // TODO: implement this
  async onNetworkChange(): Promise<void> {
    try {
      console.log('networkChange Not implemented.');
      // NOT implemented.
    } catch (error: any) {
      throw error;
    }
  }

  async onAccountChange(): Promise<void> {
    try {
      const handleAccountChange = async (newAccount: AccountInfo): Promise<void> => {
        if (newAccount === undefined) {
          if (this.connected) await this.disconnect();
          return;
        }
        const newPublicKey = newAccount.publicKey;
        this._wallet = {
          ...this._wallet,
          address: newAccount.address,
          publicKey: newPublicKey,
          authKey: newAccount.authKey
        };
      };
      if (this.provider) {
        this.provider.aptos.onAccountChange = (pubKey) => {
          if (!pubKey) {
            return;
          }
          const publicKey = AptosPublicKey.fromBase58(pubKey);
          handleAccountChange({ address: publicKey.address(), publicKey: publicKey.asString() });
        };
      } else {
        throw `${NightlyWalletName} onAccountChange Error`;
      }
    } catch (error: any) {
      console.log(error);
      const errMsg = error.message;
      throw errMsg;
    }
  }
}
