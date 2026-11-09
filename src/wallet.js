const STUDIONET = {
  chainId: "0xf22f",
  chainName: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
};

export async function connect(provider) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIONET.chainId }] });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [STUDIONET] });
  }
  await provider.request({ method: "eth_requestAccounts" });
  const [account] = await provider.request({ method: "eth_accounts" });
  return account || "";
}

export const shortAddress = (value) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Connect wallet";
