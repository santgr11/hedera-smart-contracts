// SPDX-License-Identifier: Apache-2.0

import { IWalletResult } from '@/types/common';
import { ethers, BrowserProvider } from 'ethers';
import { HEDERA_NETWORKS, PROTECTED_ROUTES } from '@/utils/common/constants';

/**
 * @dev get wallet object if available
 *
 * @return object<any>
 */
export const getWalletObject = () => {
  if (typeof window !== 'undefined') {
    const { ethereum }: any = window;
    return ethereum;
  }
};

/**
 * @dev get ethersjs wallet provider (i.e. Metamask provider)
 *
 * @return IWalletResult
 */
export const getWalletProvider = (): IWalletResult => {
  // prepare walletObject
  const walletObject = getWalletObject();
  if (!walletObject) {
    return { err: '!HEDERA' };
  }

  // get walletProvider
  const walletProvider: BrowserProvider = new ethers.BrowserProvider(walletObject);
  return { walletProvider };
};

/**
 * @dev get the balance of an account
 *
 * @params walletProvider: ethers.BrowserProvider
 *
 * @params account: string
 *
 * @returns Promise<IWalletResult>
 */
export const getBalance = async (
  walletProvider: ethers.BrowserProvider,
  account: string
): Promise<IWalletResult> => {
  try {
    const balance = await walletProvider.send('eth_getBalance', [account]);
    return {
      balance,
    };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev return current chainId of the network that the walletPro is connected to
 *
 * @params walletProvider: ethers.BrowserProvider
 *
 * @returns Promise<IWalletResult>
 */
export const getCurrentChainId = async (walletProvider: ethers.BrowserProvider): Promise<IWalletResult> => {
  try {
    const currentChainId = await walletProvider.send('eth_chainId', []);
    return {
      currentChainId,
    };
  } catch (err) {
    return { err };
  }
};

/**
 * @dev requests a list of connected accounts in a the wallet
 *
 * @params walletProvider: ethers.BrowserProvider
 *
 * @returns Promise<IWalletResult>
 */
export const requestAccount = async (walletProvider: ethers.BrowserProvider): Promise<IWalletResult> => {
  try {
    const accounts: [string] = await walletProvider.send('eth_requestAccounts', []);
    return {
      accounts,
    };
  } catch (err) {
    return { err };
  }
};

/**
 * @dev requests MetaMask to add the Hedera Testnet chain
 * 
 * @params walletProvider: ethers.BrowserProvider
 * 
 * @returns Promise<IWalletResult>
 */
export const addEthereumChain = async (
  walletProvider: ethers.BrowserProvider
): Promise<IWalletResult> => {
  try {
    const hederaTestnetParams = {
      chainId: HEDERA_NETWORKS.testnet.chainIdHex,
      chainName: HEDERA_NETWORKS.testnet.chainName,
      nativeCurrency: HEDERA_NETWORKS.testnet.nativeCurrency,
      rpcUrls: [HEDERA_NETWORKS.testnet.rpcUrls],
      blockExplorerUrls: [HEDERA_NETWORKS.testnet.blockExplorerUrls]
    };

    
    await walletProvider.send('wallet_addEthereumChain', [hederaTestnetParams]);
    return { err: null };
  } catch (err) {
    console.error('Error adding Hedera Testnet chain:', err);
    return { err };
  }
};

/**
 * @dev requests MetaMask to switch to the Hedera Testnet chain
 * If the chain hasn't been added to MetaMask yet, it will add it
 * 
 * @params walletProvider: ethers.BrowserProvider
 * 
 * @returns Promise<IWalletResult>
 */
export const switchToHederaTestnet = async (
  walletProvider: ethers.BrowserProvider
): Promise<IWalletResult> => {
  try {
    // Try to switch to the Hedera Testnet chain
    await walletProvider.send('wallet_switchEthereumChain', [{ chainId: '0x128' }]);
    return { err: null };
  } catch (error: any) {
    // If the chain hasn't been added yet (error code 4902), add it
    if (error.error.code === 4902) {
      try {
        const result = await addEthereumChain(walletProvider);
        return result;
      } catch (addError) {
        console.error('Error adding Hedera Testnet chain:', addError);
        return { err: addError };
      }
    }
    
    console.error('Error switching to Hedera Testnet chain:', error);
    return { err: error };
  }
};


