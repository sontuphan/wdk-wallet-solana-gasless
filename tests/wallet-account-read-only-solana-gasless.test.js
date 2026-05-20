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

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AccountRole } from '@solana/kit'

import { WalletAccountReadOnlySolanaGasless, WalletAccountSolanaGasless} from '@tetherto/wdk-wallet-solana-gasless'

const TEST_ADDRESS = 'HmWPZeFgxZAJQYgwh5ipYwjbVTHtjEHB3dnJ5xcQBHX9'
const TEST_ACCOUNT_ADDRESS = '3uXqWpwgqKVdiHAwF6Vmu4G4vdQzpR66xjPkz1G7zMKE'
const TEST_SEED_PHRASE =
  'test walk nut penalty hip pave soap entry language right filter choice'
const TEST_RPC_URL = 'https://mockurl.com'
const TEST_PAYMASTER_URL = 'https://mockpaymaster.com'
const TEST_PAYMASTER_TOKEN = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

const TEST_CONFIG = {
  provider: TEST_RPC_URL,
  commitment: 'confirmed',
  paymasterUrl: TEST_PAYMASTER_URL,
  paymasterAddress: TEST_ADDRESS,
  paymasterToken: {
    address: TEST_PAYMASTER_TOKEN
  }
}

function createMockRpc () {
  return {
    getBalance: jest.fn(),
    getAccountInfo: jest.fn(),
    getTokenAccountBalance: jest.fn(),
    getLatestBlockhash: jest.fn(),
    getTransaction: jest.fn(),
    getMultipleAccounts: jest.fn()
  }
}

function createMockPaymaster () {
  return {
    getPaymentInstruction: jest.fn().mockResolvedValue({
      payment_amount: '5000',
      payment_instruction: {
        programAddress: '11111111111111111111111111111111',
        accounts: [
          {
            address: TEST_ADDRESS,
            role: AccountRole.READONLY_SIGNER
          }
        ],
        data: new Uint8Array()
      }
    })
  }
}

describe('WalletAccountReadOnlySolanaGasless', () => {
  let readOnlyAccount
  let mockRpc
  let mockPaymaster

  beforeEach(() => {
    readOnlyAccount = new WalletAccountReadOnlySolanaGasless(
      TEST_ADDRESS,
      TEST_CONFIG
    )

    mockRpc = createMockRpc()
    mockPaymaster = createMockPaymaster()

    readOnlyAccount._rpc = mockRpc
    readOnlyAccount._solanaReadOnlyAccount._rpc = mockRpc
    readOnlyAccount._commitment = 'confirmed'
    readOnlyAccount._solanaReadOnlyAccount._commitment = 'confirmed'
    readOnlyAccount._paymaster = mockPaymaster
  })

  describe('Constructor', () => {
    it('should create instance with valid config', () => {
      const account = new WalletAccountReadOnlySolanaGasless(
        TEST_ADDRESS,
        TEST_CONFIG
      )

      expect(account).toBeInstanceOf(WalletAccountReadOnlySolanaGasless)
      expect(account._rpc).toBeDefined()
      expect(account._paymaster).toBeDefined()
      expect(account._commitment).toBe('confirmed')
    })

    it('should create instance without provider', () => {
      const account = new WalletAccountReadOnlySolanaGasless(TEST_ADDRESS, {
        paymasterAddress: TEST_ADDRESS,
        paymasterToken: {
          address: TEST_PAYMASTER_TOKEN
        }
      })

      expect(account._rpc).toBeUndefined()
    })
  })

  describe('getBalance', () => {
    it('should return SOL balance in lamports', async () => {
      mockRpc.getBalance.mockReturnValue({
        send: jest.fn().mockResolvedValue({ value: 1000000000n })
      })

      const balance = await readOnlyAccount.getBalance()

      expect(balance).toBe(1000000000n)
      expect(mockRpc.getBalance).toHaveBeenCalledTimes(1)
    })

    it('should throw error when not connected to provider', async () => {
      const disconnectedAccount = new WalletAccountReadOnlySolanaGasless(
        TEST_ADDRESS,
        {}
      )

      await expect(disconnectedAccount.getBalance()).rejects.toThrow(
        'The wallet must be connected to a provider to retrieve balances.'
      )
    })
  })

  describe('getTokenBalance', () => {
    it('should return token balance when ATA exists', async () => {
      mockRpc.getAccountInfo.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            lamports: 2039280n,
            data: [Buffer.alloc(165).toString('base64'), 'base64']
          }
        })
      })
      mockRpc.getTokenAccountBalance.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            amount: '1000000'
          }
        })
      })

      const balance = await readOnlyAccount.getTokenBalance(TEST_PAYMASTER_TOKEN)

      expect(balance).toBe(1000000n)
      expect(mockRpc.getAccountInfo).toHaveBeenCalledTimes(1)
      expect(mockRpc.getTokenAccountBalance).toHaveBeenCalledTimes(1)
    })

    it('should return zero when ATA does not exist', async () => {
      mockRpc.getAccountInfo.mockReturnValue({
        send: jest.fn().mockResolvedValue({ value: null })
      })

      const balance = await readOnlyAccount.getTokenBalance(TEST_PAYMASTER_TOKEN)

      expect(balance).toBe(0n)
      expect(mockRpc.getTokenAccountBalance).not.toHaveBeenCalled()
    })
  })

  describe('getTokenBalances', () => {
    function createTokenAccountData (amount) {
      const buffer = Buffer.alloc(165)
      buffer.writeBigUInt64LE(BigInt(amount), 64)
      return buffer.toString('base64')
    }

    it('should return balances for multiple tokens', async () => {
      const token2 = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      mockRpc.getMultipleAccounts.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: [
            {
              data: [createTokenAccountData(1000000), 'base64'],
              owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
              lamports: 2039280n
            },
            {
              data: [createTokenAccountData(5000000), 'base64'],
              owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
              lamports: 2039280n
            }
          ]
        })
      })

      const balances = await readOnlyAccount.getTokenBalances([
        TEST_PAYMASTER_TOKEN,
        token2
      ])

      expect(balances[TEST_PAYMASTER_TOKEN]).toBe(1000000n)
      expect(balances[token2]).toBe(5000000n)
    })

    it('should return 0n for tokens where ATA does not exist', async () => {
      mockRpc.getMultipleAccounts.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: [null]
        })
      })

      const balances = await readOnlyAccount.getTokenBalances([
        TEST_PAYMASTER_TOKEN
      ])

      expect(balances[TEST_PAYMASTER_TOKEN]).toBe(0n)
    })
  })

  describe('quoteSendTransaction', () => {
    beforeEach(() => {
      mockRpc.getLatestBlockhash.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            blockhash: 'HhqkdqemrKDK5Wd4oiCtzfpBWfdGS79YhLtzAck5Nz7T',
            lastValidBlockHeight: 100000n
          }
        })
      })
    })

    it('should quote fee for native SOL transfer with bigint value', async () => {
      const result = await readOnlyAccount.quoteSendTransaction({
        to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
        value: 1000000000n
      })

      expect(result).toEqual({ fee: 5000n })
      expect(mockPaymaster.getPaymentInstruction).toHaveBeenCalledTimes(1)
    })

    it('should quote fee for native SOL transfer with number value', async () => {
      const result = await readOnlyAccount.quoteSendTransaction({
        to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
        value: 1000000000
      })

      expect(result).toEqual({ fee: 5000n })
    })

    it('should throw error when not connected to paymaster provider', async () => {
      const disconnectedAccount = new WalletAccountReadOnlySolanaGasless(
        TEST_ADDRESS,
        { provider: TEST_RPC_URL }
      )

      await expect(
        disconnectedAccount.quoteSendTransaction({
          to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
          value: 1000n
        })
      ).rejects.toThrow(
        'The wallet must be connected to a paymaster provider to quote transactions.'
      )
    })

    it('should throw when fee payer does not match paymaster address', async () => {
      await expect(
        readOnlyAccount.quoteSendTransaction({
          version: 0,
          instructions: [],
          feePayer: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ'
        })
      ).rejects.toThrow('does not match paymaster address')
    })
  })

  describe('quoteTransfer', () => {
    beforeEach(() => {
      mockRpc.getLatestBlockhash.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            blockhash: 'HhqkdqemrKDK5Wd4oiCtzfpBWfdGS79YhLtzAck5Nz7T',
            lastValidBlockHeight: 100000n
          }
        })
      })
      mockRpc.getAccountInfo.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            lamports: 2039280n,
            data: [Buffer.alloc(165).toString('base64'), 'base64']
          }
        })
      })
    })

    it('should quote fee when recipient ATA exists', async () => {
      const result = await readOnlyAccount.quoteTransfer({
        token: TEST_PAYMASTER_TOKEN,
        recipient: TEST_ADDRESS,
        amount: 1000000n
      })

      expect(result).toEqual({ fee: 5000n })
    })

    it('should handle number amount', async () => {
      const result = await readOnlyAccount.quoteTransfer({
        token: TEST_PAYMASTER_TOKEN,
        recipient: TEST_ADDRESS,
        amount: 1000000
      })

      expect(result.fee).toBe(5000n)
    })

    it('should throw error when not connected to paymaster provider', async () => {
      const disconnectedAccount = new WalletAccountReadOnlySolanaGasless(
        TEST_ADDRESS,
        { provider: TEST_RPC_URL }
      )

      await expect(
        disconnectedAccount.quoteTransfer({
          token: TEST_PAYMASTER_TOKEN,
          recipient: TEST_ADDRESS,
          amount: 1000000n
        })
      ).rejects.toThrow(
        'The wallet must be connected to a paymaster provider to quote transfer operations.'
      )
    })
  })

  describe('getTransactionReceipt', () => {
    const MOCK_TX_SIGNATURE =
      '2k3dxVsXko3Vtb7z2W31GHCbZBzRXCAo5YYqbn7bxUCQM1RQb5Xq1XhWndFGhZGpZ5mGARUx5kavWqFVoBGujpWf'

    it('should return transaction receipt', async () => {
      const mockReceipt = {
        slot: 123456n,
        meta: {
          err: null,
          fee: 5000n
        }
      }

      mockRpc.getTransaction.mockReturnValue({
        send: jest.fn().mockResolvedValue(mockReceipt)
      })

      const receipt =
        await readOnlyAccount.getTransactionReceipt(MOCK_TX_SIGNATURE)

      expect(receipt).toEqual(mockReceipt)
      expect(mockRpc.getTransaction).toHaveBeenCalledTimes(1)
    })

    it('should return null for non-existent transaction', async () => {
      mockRpc.getTransaction.mockReturnValue({
        send: jest.fn().mockResolvedValue(null)
      })

      const receipt =
        await readOnlyAccount.getTransactionReceipt(MOCK_TX_SIGNATURE)

      expect(receipt).toBeNull()
    })
  })

  describe('verify', () => {
    it('should verify signature for same message across multiple verifications', async () => {
      const account = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        TEST_CONFIG
      )
      const message = 'Persistent message'
      const signature = await account.sign(message)

      const readOnlyAccount = new WalletAccountReadOnlySolanaGasless(
        await account.getAddress(),
        {}
      )

      expect(await readOnlyAccount.verify(message, signature)).toBe(true)
      expect(await readOnlyAccount.verify(message, signature)).toBe(true)

      account.dispose()
    })

    it('should reject signature for different message', async () => {
      const account = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        TEST_CONFIG
      )
      const signature = await account.sign('Message 1')
      const readOnlyAccount = new WalletAccountReadOnlySolanaGasless(
        await account.getAddress(),
        {}
      )

      expect(await readOnlyAccount.verify('Message 1', signature)).toBe(true)
      expect(await readOnlyAccount.verify('Message 2', signature)).toBe(false)

      account.dispose()
    })

    it('should reject invalid hex signature', async () => {
      expect(
        await readOnlyAccount.verify('Test message', 'not-a-valid-hex-signature')
      ).toBe(false)
    })
  })
})
