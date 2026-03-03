"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUtxos = getUtxos;
exports.getBalanceSats = getBalanceSats;
exports.broadcastTransaction = broadcastTransaction;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = 'https://blockstream.info/api';
async function getUtxos(address) {
    const { data } = await axios_1.default.get(`${BASE_URL}/address/${address}/utxo`);
    return data;
}
async function getBalanceSats(address) {
    var _a, _b, _c, _d;
    const { data } = await axios_1.default.get(`${BASE_URL}/address/${address}`);
    const confirmed = (((_a = data.chain_stats) === null || _a === void 0 ? void 0 : _a.funded_txo_sum) || 0) - (((_b = data.chain_stats) === null || _b === void 0 ? void 0 : _b.spent_txo_sum) || 0);
    const mempool = (((_c = data.mempool_stats) === null || _c === void 0 ? void 0 : _c.funded_txo_sum) || 0) - (((_d = data.mempool_stats) === null || _d === void 0 ? void 0 : _d.spent_txo_sum) || 0);
    return confirmed + mempool;
}
async function broadcastTransaction(rawHex) {
    const { data } = await axios_1.default.post(`${BASE_URL}/tx`, rawHex, {
        headers: { 'Content-Type': 'text/plain' }
    });
    return data;
}
