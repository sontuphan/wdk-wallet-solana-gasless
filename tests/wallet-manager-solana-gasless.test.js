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

import { describe, it, expect, beforeEach } from '@jest/globals'

import WalletManagerSolanaGasless, { WalletAccountSolanaGasless } from '@tetherto/wdk-wallet-solana-gasless'

const TEST_SEED_PHRASE =
  'test walk nut penalty hip pave soap entry language right filter choice'
const TEST_RPC_URL = 'https://mock-url.com'
const TEST_PAYMASTER_URL = 'https://mock-paymaster.com'
const TEST_PAYMASTER_ADDRESS = 'HmWPZeFgxZAJQYgwh5ipYwjbVTHtjEHB3dnJ5xcQBHX9'
const TEST_PAYMASTER_TOKEN = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

const TEST_CONFIG = {
  provider: TEST_RPC_URL,
  commitment: 'confirmed',
  paymasterUrl: TEST_PAYMASTER_URL,
  paymasterAddress: TEST_PAYMASTER_ADDRESS,
  paymasterToken: {
    address: TEST_PAYMASTER_TOKEN
  }
}

describe('WalletManagerSolanaGasless', () => {
  let wallet

  beforeEach(() => {
    wallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, TEST_CONFIG)
  })

  describe('Constructor', () => {
    it('should create wallet manager with valid config', () => {
      expect(wallet).toBeInstanceOf(WalletManagerSolanaGasless)
      expect(wallet._rpc).toBeDefined()
      expect(wallet._commitment).toBe('confirmed')
      expect(wallet._config).toEqual(TEST_CONFIG)
    })

    it('should create wallet manager with string seed phrase', () => {
      const newWallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, {
        ...TEST_CONFIG,
        provider: TEST_RPC_URL
      })

      expect(newWallet).toBeInstanceOf(WalletManagerSolanaGasless)
    })

    it('should create wallet manager without provider', () => {
      const newWallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, {
        paymasterUrl: TEST_PAYMASTER_URL,
        paymasterAddress: TEST_PAYMASTER_ADDRESS,
        paymasterToken: {
          address: TEST_PAYMASTER_TOKEN
        }
      })

      expect(newWallet).toBeInstanceOf(WalletManagerSolanaGasless)
      expect(newWallet._rpc).toBeUndefined()
    })

    it('should use default commitment level', () => {
      const newWallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, {
        provider: TEST_RPC_URL,
        paymasterUrl: TEST_PAYMASTER_URL,
        paymasterAddress: TEST_PAYMASTER_ADDRESS,
        paymasterToken: {
          address: TEST_PAYMASTER_TOKEN
        }
      })

      expect(newWallet._commitment).toBe('confirmed')
    })
  })

  describe('getAccount', () => {
    it('should return account at index 0', async () => {
      const account = await wallet.getAccount(0)

      expect(account).toBeInstanceOf(WalletAccountSolanaGasless)
      expect(account.index).toBe(0)
      expect(account.path).toBe("m/44'/501'/0'/0'")
    })

    it('should return default account at index 0', async () => {
      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountSolanaGasless)
      expect(account.index).toBe(0)
      expect(account.path).toBe("m/44'/501'/0'/0'")
    })

    it('should return different accounts for different indices', async () => {
      const account0 = await wallet.getAccount(0)
      const account1 = await wallet.getAccount(1)

      expect(account0).not.toBe(account1)
      expect(await account0.getAddress()).not.toBe(await account1.getAddress())
    })

    it('should handle large index numbers', async () => {
      const account = await wallet.getAccount(999)

      expect(account.index).toBe(999)
      expect(account.path).toBe("m/44'/501'/999'/0'")
    })

    it('should cache accounts by index', async () => {
      const accountA = await wallet.getAccount(0)
      const accountB = await wallet.getAccount(0)

      expect(accountA).toBe(accountB)
    })

    it('should pass gasless config to accounts', async () => {
      const account = await wallet.getAccount(0)

      expect(account._config).toEqual(TEST_CONFIG)
      expect(account._config.paymasterAddress).toBe(TEST_PAYMASTER_ADDRESS)
      expect(account._config.paymasterToken.address).toBe(TEST_PAYMASTER_TOKEN)
    })
  })

  describe('getAccountByPath', () => {
    it("should return account for path \"0'/0'/0'\"", async () => {
      const account = await wallet.getAccountByPath("0'/0'/0'")

      expect(account).toBeInstanceOf(WalletAccountSolanaGasless)
      expect(account.path).toBe("m/44'/501'/0'/0'/0'")
    })

    it('should return different accounts for different paths', async () => {
      const account1 = await wallet.getAccountByPath("0'/0'/0'")
      const account2 = await wallet.getAccountByPath("0'/0'/1'")

      expect(account1).not.toBe(account2)
      expect(await account1.getAddress()).not.toBe(await account2.getAddress())
    })

    it('should cache accounts by path', async () => {
      const accountA = await wallet.getAccountByPath("0'/0'/0'")
      const accountB = await wallet.getAccountByPath("0'/0'/0'")

      expect(accountA).toBe(accountB)
    })
  })

  describe('dispose', () => {
    it('should dispose all derived accounts', async () => {
      const account0 = await wallet.getAccount(0)
      const account1 = await wallet.getAccount(1)

      expect(account0.keyPair.privateKey).toBeTruthy()
      expect(account1.keyPair.privateKey).toBeTruthy()

      wallet.dispose()

      expect(account0.keyPair.privateKey).toBeNull()
      expect(account1.keyPair.privateKey).toBeNull()
    })
  })
})
