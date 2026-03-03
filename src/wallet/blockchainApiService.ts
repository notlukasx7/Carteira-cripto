import axios from 'axios';

const BASE_URL = 'https://blockstream.info/api';

export type Utxo = {
  txid: string;
  vout: number;
  value: number;
};

export async function getUtxos(address: string): Promise<Utxo[]> {
  const { data } = await axios.get<Utxo[]>(`${BASE_URL}/address/${address}/utxo`);
  return data;
}

export async function getBalanceSats(address: string): Promise<number> {
  const { data } = await axios.get<any>(`${BASE_URL}/address/${address}`);
  const confirmed =
    (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
  const mempool =
    (data.mempool_stats?.funded_txo_sum || 0) - (data.mempool_stats?.spent_txo_sum || 0);
  return confirmed + mempool;
}

export async function broadcastTransaction(rawHex: string): Promise<string> {
  const { data } = await axios.post<string>(`${BASE_URL}/tx`, rawHex, {
    headers: { 'Content-Type': 'text/plain' }
  });
  return data;
}

