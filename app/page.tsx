'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers, BrowserProvider, Contract } from "ethers";
import testnetAbi from "@/lib/abi.json";
import mainnetAbi from "@/lib/abiMainnet.json";
import { openConnectModal, openNetworkModal } from "@/lib/walletProvider";
import { useAccount, useDisconnect, useChainId, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi';
import ThreeBackground from "@/components/ThreeBackground";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface NetworkConfig {
  key: string;
  label: string;
  chainId: number;
  chainHex: string;
  rpcUrls: string[];
  explorerUrl: string;
  contractAddress: string;
  abi: any;
  hasLeaderboard: boolean;
}

interface Networks {
  [key: string]: NetworkConfig;
}

const NETWORKS: Networks = {
  testnet: {
    key: 'testnet',
    label: 'Testnet',
    chainId: 10143,
    chainHex: "0x279f",
    rpcUrls: ["https://testnet-rpc.monad.xyz/"],
    explorerUrl: "https://testnet.monadexplorer.com/",
    contractAddress: process.env.NEXT_PUBLIC_TESTNET_CONTRACT_ADDRESS || "0x7fB4F5Fc2a6f2FAa86F5F37EAEE8A0db820ad9E0",
    abi: testnetAbi,
    hasLeaderboard: false,
  },
  mainnet: {
    key: 'mainnet',
    label: 'Mainnet',
    chainId: 143,
    chainHex: "0x8f",
    rpcUrls: ["https://mainnet-rpc.monad.xyz/"],
    explorerUrl: "https://monadexplorer.com/",
    contractAddress: process.env.NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS || ZERO_ADDRESS,
    abi: mainnetAbi,
    hasLeaderboard: true,
  },
};

interface LeaderboardEntry {
  address: string;
  happyVotes: number;
}

interface LoadingState {
  wallet: boolean;
  network: boolean;
  voting: boolean;
  donation: boolean;
}

interface Message {
  text: string;
  type: 'info' | 'success' | 'error';
}

type WalletType = 'metamask' | 'walletconnect' | null;
type NetworkKey = 'testnet' | 'mainnet';

interface EthereumProvider {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, handler: (...args: any[]) => void) => void;
    removeListener: (event: string, handler: (...args: any[]) => void) => void;
    isMetaMask?: boolean;
    selectedAddress?: string;
    chainId?: string;
  };
}

declare global {
  interface Window extends EthereumProvider {}
}

function App() {
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [networkCorrect, setNetworkCorrect] = useState<boolean | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [happyVotes, setHappyVotes] = useState<number>(0);
  const [sadVotes, setSadVotes] = useState<number>(0);
  const [canVote, setCanVote] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    wallet: false,
    network: false,
    voting: false,
    donation: false,
  });
  const [message, setMessage] = useState<Message | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('mainnet');
  
  // Initialize network from localStorage on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem('Monad voting app');
      if (stored && NETWORKS[stored]) {
        setSelectedNetwork(stored as NetworkKey);
      }
    }
  }, []);

  const mainnetAddressMissing = NETWORKS.mainnet.contractAddress === ZERO_ADDRESS;
  const networkOptions = Object.values(NETWORKS);

  const activeNetworkKey = useMemo<NetworkKey | null>(() => {
    if (!chainId) return null;
    const numericChainId = Number(chainId);
    const found = Object.keys(NETWORKS).find(
      (key) => NETWORKS[key].chainId === numericChainId
    );
    return found ? (found as NetworkKey) : null;
  }, [chainId]);

  const displayNetworkKey = useMemo<NetworkKey>(() => {
    if (walletType === 'walletconnect' && activeNetworkKey) {
      return activeNetworkKey;
    }

    if (walletChainId) {
      const mapped = Object.keys(NETWORKS).find(
        (key) => NETWORKS[key].chainId === walletChainId
      );
      if (mapped) return mapped as NetworkKey;
    }

    return selectedNetwork;
  }, [walletType, activeNetworkKey, walletChainId, selectedNetwork]);
  
  const selectedNetworkConfig = NETWORKS[selectedNetwork] || NETWORKS.mainnet;
  const displayNetworkConfig = NETWORKS[displayNetworkKey] || selectedNetworkConfig;
  const isWalletConnectLocked = walletType === 'walletconnect' && isConnected;

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem('Monad voting app', selectedNetwork);
  }, [selectedNetwork]);

  // Theme management
  const toggleTheme = useCallback(() => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.body.classList.toggle('dark-theme', newTheme);
  }, [isDarkTheme]);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setIsDarkTheme(shouldUseDark);
    document.body.classList.toggle('dark-theme', shouldUseDark);
  }, []);

  const formatTime = useCallback((sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const formatAddressShort = useCallback((addr: string | null): string => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const showMessage = useCallback((text: string, type: 'info' | 'success' | 'error' = "info", duration: number = 5000) => {
    setMessage({ text, type });
    if (duration > 0) {
      setTimeout(() => setMessage(null), duration);
    }
  }, []);

  const checkNetwork = useCallback(
    async (providerToCheck: BrowserProvider, targetNetworkKey: NetworkKey = selectedNetwork): Promise<boolean> => {
      try {
        if (!providerToCheck) return false;
        const network = await providerToCheck.getNetwork();
        const detectedChain = Number(network.chainId);
        setWalletChainId(detectedChain);

        const expectedNetwork = NETWORKS[targetNetworkKey];
        if (!expectedNetwork) return false;

        const correct = detectedChain === expectedNetwork.chainId;
        setNetworkCorrect(correct);
        return correct;
      } catch (e) {
        console.error("Network check failed", e);
        setNetworkCorrect(false);
        return false;
      }
    },
    [selectedNetwork]
  );

  const initProvider = useCallback(async (): Promise<BrowserProvider | null> => {
    if (!window.ethereum) {
      showMessage("Please install MetaMask", "error");
      return null;
    }
    const newProvider = new ethers.BrowserProvider(window.ethereum as unknown as ethers.Eip1193Provider);
    setProvider(newProvider);
    await checkNetwork(newProvider);
    return newProvider;
  }, [checkNetwork, showMessage]);

  const fetchWalletConnectState = useCallback(
    async (networkKey: NetworkKey) => {
      if (!publicClient || !account || !networkKey) return;

      const config = NETWORKS[networkKey];
      if (
        !config ||
        !config.contractAddress ||
        config.contractAddress === ZERO_ADDRESS
      ) {
        setLeaderboard([]);
        setHappyVotes(0);
        setSadVotes(0);
        setCanVote(false);
        setTimeLeft(null);
        return;
      }

      try {
        const baseArgs = {
          abi: config.abi,
          address: config.contractAddress as `0x${string}`,
        };

        const result = await publicClient.readContract({
          ...baseArgs,
          functionName: "getVotes",
        } as any) as [bigint, bigint];
        setHappyVotes(Number(result[0]));
        setSadVotes(Number(result[1]));

        const walletCanVote = await publicClient.readContract({
          ...baseArgs,
          functionName: "canVote",
          args: [account as `0x${string}`],
        } as any);
        setCanVote(Boolean(walletCanVote));

        if (!walletCanVote) {
          const seconds = await publicClient.readContract({
            ...baseArgs,
            functionName: "timeUntilNextVote",
            args: [account as `0x${string}`],
          } as any);
          setTimeLeft(Number(seconds));
        } else {
          setTimeLeft(null);
        }

        if (config.hasLeaderboard) {
          const result = await publicClient.readContract({
            ...baseArgs,
            functionName: "getHappyLeaderboard",
          } as any) as [string[], bigint[]];
          const [addresses, happyCounts] = result;
          const mapped =
            addresses?.map((addr: string, index: number) => ({
              address: addr,
              happyVotes: Number(happyCounts[index]),
            })) || [];
          setLeaderboard(mapped.filter((row: LeaderboardEntry) => row.happyVotes > 0));
        } else {
          setLeaderboard([]);
        }
      } catch (err) {
        console.error("WalletConnect state sync failed:", err);
        showMessage("Failed to refresh vote stats", "error");
      }
    },
    [account, publicClient, showMessage]
  );

  const initContract = useCallback(async (
    provider: BrowserProvider,
    account: string,
    networkKey: NetworkKey = selectedNetwork
  ): Promise<Contract | null> => {
    try {
      const config = NETWORKS[networkKey];
      if (!config || !config.contractAddress || config.contractAddress === ZERO_ADDRESS) {
        setHappyVotes(0);
        setSadVotes(0);
        setCanVote(false);
        setTimeLeft(null);
        setLeaderboard([]);
        showMessage("Contract address is not configured for the selected network", "error");
        return null;
      }

      if (walletType === 'walletconnect') {
        await fetchWalletConnectState(networkKey);
        return null;
      } else {
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(config.contractAddress, config.abi, signer);
        setContract(contract);

        const [happy, sad] = await contract.getVotes();
        setHappyVotes(Number(happy));
        setSadVotes(Number(sad));

        const canVote = await contract.canVote(account);
        setCanVote(canVote);

        if (!canVote) {
          const seconds = await contract.timeUntilNextVote(account);
          setTimeLeft(Number(seconds));
        } else {
          setTimeLeft(null);
        }

        if (config.hasLeaderboard) {
          try {
            const [addresses, happyCounts] = await contract.getHappyLeaderboard();
            const mapped = addresses.map((addr: string, index: number) => ({
              address: addr,
              happyVotes: Number(happyCounts[index]),
            }));
            setLeaderboard(mapped.filter((row: LeaderboardEntry) => row.happyVotes > 0));
          } catch (leaderboardError) {
            console.warn("Failed to fetch leaderboard", leaderboardError);
            setLeaderboard([]);
          }
        } else {
          setLeaderboard([]);
        }

        return contract;
      }
    } catch (err) {
      console.error("Contract initialization failed:", err);
      showMessage("Failed to initialize contract", "error");
      return null;
    }
  }, [showMessage, walletType, fetchWalletConnectState, selectedNetwork]);

  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      showMessage("Please install MetaMask", "error");
      return;
    }

    setLoading((prev) => ({ ...prev, wallet: true }));

    try {
      const accounts = await (window.ethereum as any).request({ method: "eth_requestAccounts" });
      const selectedAccount = accounts[0] as string;
      setAccount(selectedAccount);
      setWalletType('metamask');

      const provider = await initProvider();
      if (!provider) return;

      const isCorrect = await checkNetwork(provider, selectedNetwork);
      if (!isCorrect) {
        showMessage(`Please switch MetaMask to Monad ${selectedNetworkConfig.label}`, "error");
        return;
      }

      await initContract(provider, selectedAccount, selectedNetwork);
      showMessage("MetaMask connected", "success");
    } catch (err) {
      showMessage("Failed to connect MetaMask", "error");
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, wallet: false }));
    }
  }, [checkNetwork, initProvider, initContract, showMessage, selectedNetwork, selectedNetworkConfig.label]);

  const connectWalletConnect = useCallback(() => {
    setWalletType('walletconnect');
    openConnectModal();
  }, []);

  const connectWallet = useCallback((type: 'metamask' | 'walletconnect') => {
    if (type === 'metamask') {
      connectMetaMask();
    } else if (type === 'walletconnect') {
      connectWalletConnect();
    }
  }, [connectMetaMask, connectWalletConnect]);

  const switchNetwork = useCallback(
    async (targetNetworkKey: NetworkKey = selectedNetwork) => {
      const targetConfig = NETWORKS[targetNetworkKey];
      if (!targetConfig) return;

      try {
        setLoading((prev) => ({ ...prev, network: true }));

        if (walletType === 'walletconnect') {
          if (switchChain) {
            await switchChain({ chainId: targetConfig.chainId });
          } else if (walletClient?.switchChain) {
            await walletClient.switchChain({ id: targetConfig.chainId });
          } else {
            openNetworkModal();
            showMessage("Please switch networks in your wallet", "info");
            return;
          }

          setNetworkCorrect(true);
          showMessage(`Switched to Monad ${targetConfig.label}`, "success");
          await fetchWalletConnectState(targetNetworkKey);
          return;
        }

        if (window.ethereum) {
          try {
            await (window.ethereum as any).request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: targetConfig.chainHex }],
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await (window.ethereum as any).request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: targetConfig.chainHex,
                  chainName: `Monad ${targetConfig.label}`,
                  rpcUrls: targetConfig.rpcUrls,
                  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
                  blockExplorerUrls: [targetConfig.explorerUrl],
                }],
              });
            } else {
              throw switchError;
            }
          }

          const updatedProvider = new ethers.BrowserProvider(window.ethereum as unknown as ethers.Eip1193Provider);
          setProvider(updatedProvider);
          await checkNetwork(updatedProvider, targetNetworkKey);
          if (account) await initContract(updatedProvider, account, targetNetworkKey);
          showMessage(`Switched to Monad ${targetConfig.label}`, "success");
          return;
        }

        showMessage("No provider available to switch network", "error");
      } catch (err) {
        console.error("Network switch failed", err);
        showMessage("Failed to switch network", "error");
      } finally {
        setLoading((prev) => ({ ...prev, network: false }));
      }
    },
    [selectedNetwork, walletType, switchChain, walletClient, fetchWalletConnectState, showMessage, checkNetwork, initContract, account]
  );

  const vote = useCallback(async (isHappy: boolean) => {
    if (!account) {
      showMessage("Connect wallet first", "error");
      return;
    }

    if (!networkCorrect) {
      showMessage(`Connect to Monad ${selectedNetworkConfig.label}`, "error");
      return;
    }

    const networkKey = walletType === 'walletconnect' ? activeNetworkKey : selectedNetwork;
    if (!networkKey) {
      showMessage("Unsupported network", "error");
      return;
    }

    const targetConfig = NETWORKS[networkKey];
    if (!targetConfig || targetConfig.contractAddress === ZERO_ADDRESS) {
      showMessage("Contract address missing for this network", "error");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, voting: true }));

      if (walletType === 'walletconnect') {
        if (!walletClient || !publicClient) {
          showMessage("WalletConnect client not ready", "error");
          return;
        }
        if (walletClient.chain?.id !== targetConfig.chainId) {
          showMessage(`Please switch to Monad ${targetConfig.label}`, "error");
          return;
        }

        const txHash = await walletClient.writeContract({
          abi: targetConfig.abi,
          address: targetConfig.contractAddress as `0x${string}`,
          functionName: "vote",
          args: [isHappy],
          account: (walletClient.account?.address ?? account) as `0x${string}`,
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        await fetchWalletConnectState(networkKey);
        showMessage("Vote successful!", "success");
      } else if (contract) {
        const tx = await contract.vote(isHappy);
        await tx.wait();

        const [happy, sad] = await contract.getVotes();
        setHappyVotes(Number(happy));
        setSadVotes(Number(sad));
        setCanVote(false);

        const seconds = await contract.timeUntilNextVote(account);
        setTimeLeft(Number(seconds));

        if (targetConfig.hasLeaderboard && typeof contract.getHappyLeaderboard === "function") {
          const [addresses, happyCounts] = await contract.getHappyLeaderboard();
          const mapped = addresses.map((addr: string, index: number) => ({
            address: addr,
            happyVotes: Number(happyCounts[index]),
          }));
          setLeaderboard(mapped.filter((row: LeaderboardEntry) => row.happyVotes > 0));
        }

        showMessage("Vote successful!", "success");
      }
    } catch (err) {
      showMessage("Voting failed", "error");
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, voting: false }));
    }
  }, [contract, account, networkCorrect, showMessage, walletType, walletClient, publicClient, fetchWalletConnectState, activeNetworkKey, selectedNetwork, selectedNetworkConfig.label]);

  const disconnectWallet = useCallback(() => {
    if (walletType === 'walletconnect' && isConnected) {
      disconnect();
    }
    setAccount(null);
    setProvider(null);
    setContract(null);
    setNetworkCorrect(null);
    setCanVote(false);
    setTimeLeft(null);
    setWalletType(null);
    setLeaderboard([]);
    setWalletChainId(null);
    showMessage("Wallet disconnected", "info");
  }, [showMessage, walletType, isConnected, disconnect]);

  const donate = useCallback(async () => {
    if (!account) {
      showMessage("Connect wallet first", "error");
      return;
    }

    const networkKey = walletType === 'walletconnect' ? activeNetworkKey : selectedNetwork;
    const targetConfig = networkKey ? NETWORKS[networkKey] : null;

    try {
      setLoading((prev) => ({ ...prev, donation: true }));

      if (walletType === 'walletconnect') {
        if (!walletClient || !publicClient) {
          showMessage("WalletConnect client not ready", "error");
          return;
        }
        if (!targetConfig) {
          showMessage("Unsupported network", "error");
          return;
        }
        if (walletClient.chain?.id !== targetConfig.chainId) {
          showMessage(`Please switch to Monad ${targetConfig.label}`, "error");
          return;
        }

        const txHash = await walletClient.sendTransaction({
          to: "0x1f1dd9c30181e8e49D5537Bc3E81c33896e778Bd" as `0x${string}`,
          value: ethers.parseEther("10"),
          account: (walletClient.account?.address ?? account) as `0x${string}`,
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        showMessage("Thanks for donating!", "success");
        return;
      }

      if (!provider) {
        showMessage("Connect wallet first", "error");
        return;
      }

      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: "0x1f1dd9c30181e8e49D5537Bc3E81c33896e778Bd",
        value: ethers.parseEther("10"),
      });
      await tx.wait();
      showMessage("Thanks for donating!", "success");
    } catch (err) {
      showMessage("Donation failed", "error");
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, donation: false }));
    }
  }, [provider, account, walletType, walletClient, publicClient, activeNetworkKey, selectedNetwork, showMessage]);

  const handleNetworkChange = useCallback((networkKey: NetworkKey) => {
    if (!NETWORKS[networkKey]) return;
    setSelectedNetwork(networkKey);

    if (account) {
      switchNetwork(networkKey);
    } else if (walletType === 'metamask' && provider) {
      checkNetwork(provider, networkKey);
    }
  }, [account, walletType, provider, checkNetwork, switchNetwork]);

  // Обработка подключения через WalletConnect
  useEffect(() => {
    if (isConnected && address && walletType === 'walletconnect') {
      setAccount(address);

      if (!activeNetworkKey) {
        setNetworkCorrect(false);
        showMessage("Unsupported network selected in wallet", "error");
        return;
      }

      const isCorrectNetwork = activeNetworkKey === selectedNetwork;
      setNetworkCorrect(isCorrectNetwork);

      if (isCorrectNetwork) {
        showMessage(`WalletConnect connected to Monad ${NETWORKS[activeNetworkKey].label}`, "success");
        fetchWalletConnectState(activeNetworkKey);
      } else {
        showMessage(`Please switch to Monad ${selectedNetworkConfig.label}`, "error");
      }
    }
  }, [isConnected, address, walletType, activeNetworkKey, selectedNetwork, selectedNetworkConfig.label, fetchWalletConnectState, showMessage]);

  useEffect(() => {
    if (walletType !== 'walletconnect') return;
    if (!isConnected || !account || !networkCorrect || !activeNetworkKey) return;

    fetchWalletConnectState(activeNetworkKey);
  }, [walletType, isConnected, account, networkCorrect, fetchWalletConnectState, activeNetworkKey]);

  // Автообновление сети при изменении
  useEffect(() => {
    if (!window.ethereum || walletType === 'walletconnect') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnectWallet();
      else {
        setAccount(accounts[0]);
        if (provider) initContract(provider, accounts[0], selectedNetwork);
      }
    };

    const handleChainChanged = async () => {
      const newProvider = new ethers.BrowserProvider(window.ethereum! as unknown as ethers.Eip1193Provider);
      setProvider(newProvider);
      await checkNetwork(newProvider, selectedNetwork);
      if (account) await initContract(newProvider, account, selectedNetwork);
    };

    (window.ethereum as any)?.on("accountsChanged", handleAccountsChanged);
    (window.ethereum as any)?.on("chainChanged", handleChainChanged);

    return () => {
      (window.ethereum as any)?.removeListener("accountsChanged", handleAccountsChanged);
      (window.ethereum as any)?.removeListener("chainChanged", handleChainChanged);
    };
  }, [provider, account, initContract, checkNetwork, disconnectWallet, walletType, selectedNetwork]);

  useEffect(() => {
    if (provider) checkNetwork(provider, selectedNetwork);
  }, [provider, checkNetwork, selectedNetwork]);

  useEffect(() => {
    if (walletType !== 'walletconnect') return;
    if (!activeNetworkKey) {
      setNetworkCorrect(false);
      return;
    }
    setNetworkCorrect(activeNetworkKey === selectedNetwork);
  }, [walletType, activeNetworkKey, selectedNetwork]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev !== null ? Math.max(prev - 1, 0) : null);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeLeft]);

  const totalVotes = happyVotes + sadVotes;
  const happyPercent = totalVotes ? Math.round((happyVotes / totalVotes) * 100) : 0;
  const sadPercent = totalVotes ? 100 - happyPercent : 0;
  const topLeaderboard = leaderboard.slice(0, 10);
  const extraLeaderboard = leaderboard.slice(10);

  return (
    <div className="app-container">
      {/* Video Background */}
      <div className="video-background">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="background-video"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>
      </div>
      
      {/* 3D Background */}
      <ThreeBackground isDark={isDarkTheme} />
      
      {/* Theme Toggle */}
      <button onClick={toggleTheme} className="theme-toggle">
        <span className="theme-icon">{isDarkTheme ? '🌙' : '☀️'}</span>
        <span>{isDarkTheme ? 'Dark' : 'Light'}</span>
      </button>

      {message && (
        <div className={`notification ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="close-btn">×</button>
        </div>
      )}

      {account && networkCorrect === false && (
        <div className="network-warning">
          ⚠️ Wrong network<br/>
          <button
            onClick={() => switchNetwork()}
            className="switch-network-button"
            disabled={loading.network}
          >
            {loading.network ? "Switching..." : `Switch to Monad ${selectedNetworkConfig.label}`}
          </button>
        </div>
      )}

      <div className="title-row">
        <h1 className="app-title">Monad voting app 🌍</h1>
        <span className={`network-badge ${displayNetworkKey === 'mainnet' ? 'badge-mainnet' : 'badge-testnet'}`}>
          {displayNetworkConfig?.label || 'Mainnet'}
        </span>
      </div>

      <div className="network-selector">
        <label>Preferred network</label>
        <div className="network-buttons">
          {networkOptions.map((network) => (
            <button
              key={network.key}
              onClick={() => {
                if (!isWalletConnectLocked) {
                  handleNetworkChange(network.key as NetworkKey);
                }
              }}
              disabled={isWalletConnectLocked}
              className={`network-button ${selectedNetwork === network.key ? 'active' : ''} ${network.key === 'mainnet' ? 'mainnet' : 'testnet'}`}
            >
              <span className="network-button-icon">
                {network.key === 'mainnet' ? '🌐' : '🧪'}
              </span>
              <span className="network-button-text">Monad {network.label}</span>
            </button>
          ))}
        </div>
        {selectedNetwork === 'mainnet' && mainnetAddressMissing && (
          <p className="network-selector-warning">
            Deploy the leaderboard contract and set NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS.
          </p>
        )}
      </div>

      {!account ? (
        <div className="wallet-connection">
          <h3>Choose your wallet:</h3>
          <div className="wallet-buttons">
            <button
              onClick={() => connectWallet('metamask')}
              className="connect-button metamask-button"
              disabled={loading.wallet}
            >
              {loading.wallet ? "Connecting..." : "🦊 MetaMask"}
            </button>
            <button
              onClick={() => connectWallet('walletconnect')}
              className="connect-button walletconnect-button"
              disabled={loading.wallet}
            >
              {loading.wallet ? "Connecting..." : "🔗 WalletConnect"}
            </button>
          </div>
          <div className="wallet-connect-note">
            WalletConnect supports 300+ wallets including mobile wallets
          </div>
        </div>
      ) : (
        <>
          <div className="wallet-info">
            <strong>Connected:</strong> {formatAddressShort(account)}
            <button onClick={disconnectWallet} className="disconnect-button">Disconnect</button>
          </div>

          <div className="vote-buttons">
            <button
              onClick={() => vote(true)}
              disabled={!canVote || loading.voting}
              className="happy-button"
            >
              😊 I'm Happy
            </button>
            <button
              onClick={() => vote(false)}
              disabled={!canVote || loading.voting}
              className="sad-button"
            >
              😢 I'm Sad
            </button>
          </div>

          {!canVote && timeLeft !== null && (
            <div className="vote-timer">
              <p>You've already voted. Next vote in:</p>
              <p className="timer">{formatTime(timeLeft)}</p>
            </div>
          )}

          <div className="mood-box">
            <h3>Current Mood</h3>
            <div className="happiness-meter-container">
              <div className="happiness-meter-happy" style={{ width: `${happyPercent}%` }}></div>
              <div className="happiness-meter-sad" style={{ width: `${sadPercent}%` }}></div>
            </div>
            <div className="happiness-meter-labels">
              <span>😊 Happy ({happyPercent}%)</span>
              <span>😢 Sad ({sadPercent}%)</span>
            </div>
            <p>Total votes: <strong>{totalVotes}</strong></p>
          </div>

          {displayNetworkKey === 'mainnet' && (
            <div className="leaderboard">
              <div className="leaderboard-header">
                <h3>Happy Leaderboard</h3>
                <span>Top smiles on Monad {displayNetworkConfig?.label}</span>
              </div>

              {topLeaderboard.length === 0 ? (
                <p className="leaderboard-empty">Be the first happy voter on mainnet!</p>
              ) : (
                <>
                  <ol className="leaderboard-list">
                    {topLeaderboard.map((row, index) => (
                      <li key={`${row.address}-${index}`}>
                        <span className="leaderboard-rank">#{index + 1}</span>
                        <span className="leaderboard-address">{formatAddressShort(row.address)}</span>
                        <span className="leaderboard-votes">{row.happyVotes} 😊</span>
                      </li>
                    ))}
                  </ol>

                  {extraLeaderboard.length > 0 && (
                    <details className="leaderboard-extra">
                      <summary>Show the rest ({extraLeaderboard.length})</summary>
                      <div className="leaderboard-scroll">
                        <ol start={11}>
                          {extraLeaderboard.map((row, index) => (
                            <li key={`${row.address}-${index + 10}`}>
                              <span className="leaderboard-rank">#{index + 11}</span>
                              <span className="leaderboard-address">{formatAddressShort(row.address)}</span>
                              <span className="leaderboard-votes">{row.happyVotes} 😊</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      <hr className="divider" />

      <div className="links-section">
        <h4>Links & Support</h4>
        <div className="links">
          <a href="https://github.com/terauss/Monad-voting-app." target="_blank" rel="noopener noreferrer">
            <button className="link-button">GitHub</button>
          </a>
          <a href="https://x.com/x-teraus" target="_blank" rel="noopener noreferrer">
            <button className="link-button">X (Twitter)</button>
          </a>
          <button
            onClick={donate}
            className="donate-button"
            disabled={loading.donation}
          >
            {loading.donation ? "Processing..." : "Donate 10 MON"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

