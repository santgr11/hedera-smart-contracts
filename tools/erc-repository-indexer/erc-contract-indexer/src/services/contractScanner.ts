// SPDX-License-Identifier: Apache-2.0

import { AxiosError, AxiosInstance } from 'axios';
import constants from '../utils/constants';
import { Helper } from '../utils/helper';
import {
  ContractCallData,
  Links,
  MirrorNodeContract,
  MirrorNodeContractResponse,
} from '../schemas/MirrorNodeSchemas';

export class ContractScannerService {
  /**
   * @private
   * @readonly
   * @property {AxiosInstance} mirrorNodeRestClient - Axios client instance for interacting with the Hedera Mirror Node REST API.
   */
  private readonly mirrorNodeRestClient: AxiosInstance;

  /**
   * @private
   * @readonly
   * @property {AxiosInstance} mirrorNodeWeb3Client - Axios client instance for interacting with the Hedera Mirror Node Web3Module API.
   */
  private readonly mirrorNodeWeb3Client: AxiosInstance;

  /**
   * @private
   * @readonly
   * @property {number} scanContractLimit - The maximum number of contracts to scan per operation.
   */
  private readonly scanContractLimit: number;

  constructor(
    mirrorNodeUrl: string,
    mirrorNodeUrlWeb3: string,
    scanContractLimit: number
  ) {
    const mirrorNodeClients = Helper.buildAxiosClient(
      mirrorNodeUrl,
      mirrorNodeUrlWeb3
    );
    this.mirrorNodeRestClient = mirrorNodeClients.mirrorNodeRestClient;
    this.mirrorNodeWeb3Client = mirrorNodeClients.mirrorNodeWeb3Client;
    this.scanContractLimit = scanContractLimit;
  }

  /**
   * Fetches contracts from the mirror node API.
   * @param {string | null} next - The pagination token for the next set of results. If null, fetches from the beginning.
   * @returns {Promise<{ contracts: MirrorNodeContract[]; links: Links } | null>} A promise that resolves to an object containing an array of contract data and pagination links, or null if the request fails.
   * @throws {Error} When there is a network or API error. Rate limit errors (429) are automatically retried.
   */
  async fetchContracts(
    next: string | null = null
  ): Promise<{ contracts: MirrorNodeContract[]; links: Links } | null> {
    const getAllContractPath = Helper.buildUrl(next, this.scanContractLimit);
    console.log('Fetching contract batch from URL:', getAllContractPath);

    try {
      const response = await this.mirrorNodeRestClient.get(getAllContractPath);
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, this.fetchContracts, next);
    }
  }

  /**
   * Fetches detailed contract object for a specific contract from the mirror node API.
   * @param {string} contractId - The ID of the contract to fetch details for.
   * @returns {Promise<MirrorNodeContractResponse | null>} A promise that resolves to the contract details including bytecode, or null if the request fails.
   * @throws {Error} When there is a network or API error. Rate limit errors (429) are automatically retried.
   */
  async fetchContractObject(
    contractId: string
  ): Promise<MirrorNodeContractResponse | null> {
    try {
      const response = await this.mirrorNodeRestClient.get(
        `${constants.GET_CONTRACT_ENDPOINT}/${contractId}`
      );
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, this.fetchContractObject, contractId);
    }
  }

  /**
   * Handles Axios errors, specifically dealing with rate limiting (429) errors by implementing retry logic.
   * @param {unknown} error - The error thrown by Axios
   * @param {(param: string | null) => any} retryMethod - The method to retry if rate limited
   * @param {any} param - Parameter to pass to the retry method
   * @returns {Promise<any>} Returns the result of the retry method if successful, null otherwise
   */
  private async handleAxiosError(
    error: unknown,
    retryMethod: (param: any) => any,
    param: any
  ): Promise<any> {
    const isRateLimitError = (error as AxiosError).response?.status === 429;
    const isBadRequestError = (error as AxiosError).response?.status === 400;
    if (isRateLimitError) {
      console.log(
        `Rate limit exceeded. Retrying in ${constants.RETRY_DELAY_MS}ms...`
      );
      await Helper.wait(constants.RETRY_DELAY_MS);
      return retryMethod.call(this, param);
    }

    // Bad requests for contractCallRequest are expected for non-ERC contracts.
    // To prevent log clutter, log the error only if it is not a bad request originating from contractCallRequest.
    if (
      !isBadRequestError &&
      retryMethod.name !== this.contractCallRequest.name
    ) {
      console.error('Error returned from the mirror node:', error);
    }

    return null;
  }
  /**
   * Sends a contract call request to the mirror node API.
   *
   * This method constructs a POST request to the contract call endpoint with the provided call data.
   * It handles any potential errors, including rate limit errors, by retrying the request if necessary.
   *
   * @param {ContractCallData} callData - The data required for the contract call, including the target contract address and the data to be sent.
   * @returns {Promise<any>} A promise that resolves to the result of the contract call, or null if the request fails.
   * @throws {Error} When there is a network or API error.
   */
  async contractCallRequest(callData: ContractCallData): Promise<any> {
    try {
      const response = await this.mirrorNodeWeb3Client.post(
        constants.CONTRACT_CALL_ENDPOINT,
        callData
      );
      return response.data.result;
    } catch (error) {
      return this.handleAxiosError(error, this.contractCallRequest, callData);
    }
  }
}
