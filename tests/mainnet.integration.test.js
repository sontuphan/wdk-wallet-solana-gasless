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

// Mainnet integration test. This broadcasts a real transaction and pays a real
// paymaster-token fee, so it is opt-in only: it runs only when RUN_INTEGRATION=true.
//
//   npm run test:integration
//
// Required environment (loaded from .env):
//   MNEMONIC                  - the wallet's BIP-39 seed phrase
//   CANDIDE_RPC_URL           - the Kora paymaster RPC url
//   CANDIDE_API_KEY           - the Kora paymaster API key
//   CANDIDE_PAYMASTER_ADDRESS - the paymaster program address
// Optional:
//   SOLANA_RPC_URL            - the app's Solana RPC provider (defaults to mainnet-beta)

import dotenv from 'dotenv'

import { describe, test, expect } from '@jest/globals'

import { WalletAccountSolanaGasless } from '../index.js'

dotenv.config({ quiet: true })

// USDT (mainnet) — the paymaster token used to pay fees.
const PAYMASTER_TOKEN = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

describe('WalletAccountSolanaGasless (mainnet integration)', () => {
  const { MNEMONIC, CANDIDE_RPC_URL, CANDIDE_API_KEY, CANDIDE_PAYMASTER_ADDRESS } = process.env

  const config = {
    provider: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    commitment: 'confirmed',
    paymasterUrl: {
      rpcUrl: CANDIDE_RPC_URL,
      apiKey: CANDIDE_API_KEY
    },
    paymasterAddress: CANDIDE_PAYMASTER_ADDRESS,
    paymasterToken: {
      address: PAYMASTER_TOKEN
    }
  }

  test('logs the account address and sends a transaction to itself', async () => {
    if (!MNEMONIC || !CANDIDE_RPC_URL || !CANDIDE_API_KEY || !CANDIDE_PAYMASTER_ADDRESS) {
      throw new Error('Missing required integration env vars: MNEMONIC, CANDIDE_RPC_URL, CANDIDE_API_KEY, CANDIDE_PAYMASTER_ADDRESS.')
    }

    const account = new WalletAccountSolanaGasless(MNEMONIC, "0'/0'", config)

    try {
      const address = await account.getAddress()
      console.log('Account address:', address)

      // Sign a native SOL transfer to itself first, then broadcast the already-signed
      // transaction. This exercises the signed-transaction branch of sendTransaction,
      // where the real paymaster payment instruction can be inspected.
      const signedTransaction = await account.signTransaction({ to: address, value: 1n })
      const { hash } = await account.sendTransaction(signedTransaction)
      console.log('Transaction hash:', hash)

      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    } finally {
      account.dispose()
    }
  }, 120_000)
})
