// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import WalletManager from '@tetherto/wdk-wallet'

import FailoverProvider from '@tetherto/wdk-failover-provider'

import { createSolanaRpc } from '@solana/rpc'

import WalletAccountSolanaGasless from './wallet-account-solana-gasless.js'

/** @typedef {ReturnType<typeof import('@solana/rpc').createSolanaRpc>} SolanaRpc */
/** @typedef {import('@solana/rpc-types').Commitment} Commitment */

/** @typedef {import('./wallet-account-solana-gasless.js').SolanaGaslessWalletConfig} SolanaGaslessWalletConfig */

export default class WalletManagerSolanaGasless extends WalletManager {
  /**
   * Creates a new wallet manager for the gasless solana.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {SolanaGaslessWalletConfig} [config] - The configuration object.
   */
  constructor (seed, config = {}) {
    super(seed, config)

    /**
     * The solana gasless wallet configuration.
     *
     * @protected
     * @type {SolanaGaslessWalletConfig}
     */
    this._config = config

    const { provider: providerOption, rpcUrl, commitment = 'confirmed', retries = 3 } = config
    const rpcTarget = providerOption ?? rpcUrl

    /**
     * The commitment level for transactions.
     *
     * @protected
     * @type {Commitment}
     */
    this._commitment = commitment

    /**
     * A Solana RPC client for HTTP requests.
     *
     * @protected
     * @type {SolanaRpc | undefined}
     */
    this._rpc = undefined

    if (Array.isArray(rpcTarget)) {
      if (rpcTarget.length > 0) {
        const failoverProvider = new FailoverProvider({ retries })
        for (const entry of rpcTarget) {
          const option = createSolanaRpc(entry)
          failoverProvider.addProvider(option)
        }
        this._rpc = failoverProvider.initialize()
      }
    } else if (rpcTarget) {
      this._rpc = createSolanaRpc(rpcTarget)
    }
  }

  /**
   * Returns the wallet account at a specific index (see [SLIP-0010](https://slips.readthedocs.io/en/latest/slip-0010/)).
   *
   * @example
   * // Returns the account with derivation path m/44'/501'/index'/0'
   * const account = await wallet.getAccount(1);
   * @param {number} [index] - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountSolanaGasless>} The account.
   */
  async getAccount (index = 0) {
    return await this.getAccountByPath(`${index}'/0'`)
  }

  /**
   * Returns the wallet account at a specific SLIP-0010 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/501'/0'/0'/1'
   * const account = await wallet.getAccountByPath("0'/0'/1'");
   * @param {string} path - The derivation path (e.g. "0'/0'/0'").
   * @returns {Promise<WalletAccountSolanaGasless>} The account.
   */
  async getAccountByPath (path) {
    if (!this._accounts[path]) {
      const account = new WalletAccountSolanaGasless(this.seed, path, this._config)

      this._accounts[path] = account
    }

    return this._accounts[path]
  }
}
