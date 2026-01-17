"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { avalancheFuji } from "wagmi/chains";
import toast, { Toaster } from "react-hot-toast";
import { FiLink } from "react-icons/fi";
import { MdRefresh } from "react-icons/md";
import { LuPencil } from "react-icons/lu";
import { BsLightningChargeFill } from "react-icons/bs";
import {
  ShieldCheck,
  Dot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  getBlockchainValue,
  getBlockchainEvents,
} from "@/src/services/blockchain.service";

// ==============================
// 🔹 CONFIG
// ==============================
const CONTRACT_ADDRESS = "0x5f329c7c45318a8c7c42ef80b8f7ef55ddca9d5b";

const SIMPLE_STORAGE_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "oldOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnerSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newValue",
        type: "uint256",
      },
    ],
    name: "ValueUpdated",
    type: "event",
  },
  {
    inputs: [],
    name: "getValue",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "setValue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export default function Page() {
  // ==============================
  // 🔹 HOOKS
  // ==============================
  const { address, isConnected, chain } = useAccount();
  const {
    connect,
    isPending: isConnecting,
    error: connectError,
  } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // ==============================
  // 🔹 STATE
  // ==============================
  interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
  }
  
  interface BlockchainEvent {
    blockNumber: string;
    value: string;
    txHash: string;
    logIndex: number;
  }
  
  const [inputValue, setInputValue] = useState("");
  const [blockchainValue, setBlockchainValue] = useState<ApiResponse<{ value: string }> | null>(null);
  const [blockchainEvents, setBlockchainEvents] = useState<ApiResponse<BlockchainEvent[]> | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // ==============================
  // 🔹 CONTRACT INTERACTIONS
  // ==============================


  const {
    data: hash,
    writeContract,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isTxSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // ==============================
  // 🔹 FETCH BLOCKCHAIN DATA
  // ==============================
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchBlockchainData = async () => {
    try {
      setIsLoadingData(true);
      const value = await getBlockchainValue();
      const events = await getBlockchainEvents();
      
      // Validasi data sebelum set state
      if (value && value.data && typeof value.data.value !== 'undefined') {
        setBlockchainValue(value);
      } else {
        console.warn("Invalid value data received:", value);
        toast.error("Received invalid blockchain value data");
      }
      
      if (events && events.data && Array.isArray(events.data)) {
        setBlockchainEvents(events);
      } else {
        console.warn("Invalid events data received:", events);
        toast.error("Received invalid blockchain events data");
      }
    } catch (error: unknown) {
      console.error("Error fetching blockchain data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch blockchain data";
      
      // Cek apakah backend tidak berjalan
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("ECONNREFUSED")) {
        toast.error("Backend connection failed. Please try again later.");
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
      
      // Set null untuk menunjukkan error
      setBlockchainValue(null);
      setBlockchainEvents(null);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    fetchBlockchainData();
  }, [isMounted]);

  // ==============================
  // 🔹 NETWORK VALIDATION
  // ==============================
  const isWrongNetwork = chain && chain.id !== avalancheFuji.id;

  // ==============================
  // 🔹 HANDLERS
  // ==============================
  const handleSetValue = () => {
    if (!inputValue || isWrongNetwork) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: SIMPLE_STORAGE_ABI,
      functionName: "setValue",
      args: [BigInt(inputValue)],
    });
  };

  const handleSwitchNetwork = () => {
    switchChain({ chainId: avalancheFuji.id });
  };

  const handleConnectWallet = () => {
    connect({ connector: injected() });
  };

  // ==============================
  // 🔹 UTILITY FUNCTIONS
  // ==============================
  function shortenAddress(addr: string) {
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  }

  // ==============================
  // 🔹 COMPUTED VALUES
  // ==============================
  const isTxPending = isWriting || isConfirming;

  // Auto switch to Avalanche Fuji when wallet connected
  useEffect(() => {
    if (isConnected && isWrongNetwork) {
      switchChain({ chainId: avalancheFuji.id });
    }
  }, [isConnected, isWrongNetwork, switchChain]);

  // ==============================
  // 🔹 EFFECTS - CONNECT ERROR HANDLING
  // ==============================
  useEffect(() => {
    if (connectError) {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="shrink-0 pt-0.5">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Error connecting wallet
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        ),
        { duration: 4000 },
      );
    }
  }, [connectError]);

  // ==============================
  // 🔹 EFFECTS - SUCCESS HANDLING
  // ==============================
  useEffect(() => {
    if (isTxSuccess) {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="shrink-0 pt-0.5">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Value updated successfully
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Transaction confirmed on chain
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ),
        {
          duration: 4000,
        },
      );
      fetchBlockchainData();
      setInputValue("");
    }
  }, [isTxSuccess]);

  // ==============================
  // 🔹 EFFECTS - ERROR HANDLING
  // ==============================
  useEffect(() => {
    if (writeError) {
      const errorMsg = writeError.message || "";

      if (
        errorMsg.includes("User rejected") ||
        errorMsg.includes("User denied") ||
        errorMsg.includes("user rejected")
      ) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="shrink-0 pt-0.5">
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Transaction cancelled
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      You rejected the request in your wallet
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          ),
          { duration: 3000 },
        );
      } else if (errorMsg.includes("insufficient funds")) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="shrink-0 pt-0.5">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Insufficient balance
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Not enough AVAX to cover gas fees
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          ),
          { duration: 3000 },
        );
      } else {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="shrink-0 pt-0.5">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Transaction failed
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Something went wrong. Please try again
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          ),
          { duration: 3000 },
        );
      }

      console.error("Write error:", writeError);
    }
  }, [writeError]);

  useEffect(() => {
    if (confirmError) {
      const errorMsg = confirmError.message || "";

      if (errorMsg.includes("execution reverted")) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="shrink-0 pt-0.5">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Transaction reverted
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Contract rejected the transaction
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          ),
          { duration: 3000 },
        );
      } else {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="shrink-0 pt-0.5">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Confirmation failed
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Unable to confirm transaction
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          ),
          { duration: 3000 },
        );
      }

      console.error("Confirm error:", confirmError);
    }
  }, [confirmError]);

  // ==============================
  // 🔹 EFFECTS - WRONG NETWORK WARNING
  // ==============================
  useEffect(() => {
    if (isWrongNetwork && isConnected) {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="shrink-0 pt-0.5">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Wrong network
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Please switch to Avalanche Fuji
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        ),
        {
          duration: 5000,
          id: "wrong-network",
        },
      );
    }
  }, [isWrongNetwork, isConnected]);

  // ==============================
  // 🔹 RENDER
  // ==============================
  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          className: "",
          duration: 4000,
        }}
      />

      <style jsx global>{`
        @keyframes enter {
          0% {
            transform: translate3d(0, -200%, 0) scale(0.6);
            opacity: 0.5;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }

        @keyframes leave {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.5);
            opacity: 0;
          }
        }

        .animate-enter {
          animation: enter 0.35s ease-out;
        }

        .animate-leave {
          animation: leave 0.4s ease-out forwards;
        }
      `}</style>

      <main className="min-h-screen flex items-center justify-center bg-linear-to-bl from-[#0a0e1a] via-[#0d1117] to-[#1a0d1f] text-white">
        <div className="w-full max-w-md border bg-[#0a0e1a] border-gray-700 rounded-2xl p-6 space-y-6 pb-8">
          <div className="bg-white/10 rounded-full w-fit px-3 py-1">
            <h1 className="font-bold text-blue-500 text-sm">
              AVALANCHE NETWORK
            </h1>
          </div>
          <h1 className="text-2xl font-bold">Day 3 – Frontend dApp</h1>

          {!isMounted ? (
            <div className="space-y-2">
              <div className="flex justify-end -mt-5">
                <Dot className="text-gray-600" size={40} />
              </div>
              <div className="w-full bg-white hover:opacity-80 text-black font-semibold py-2 rounded-md opacity-50 text-center">
                Loading...
              </div>
            </div>
          ) : !isConnected ? (
            <div>
              <div className="flex justify-end -mt-5">
                <Dot className="text-red-600" size={40} />
              </div>
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full bg-white hover:opacity-80 text-black font-semibold py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h1 className="text-sm font-semibold text-gray-400">
                  CONNECTED ADDRESS
                </h1>
                <Dot className="text-green-600" size={40} />
              </div>
              <div className="bg-[#141b2d] p-4 rounded-xl ring-1 ring-slate-600">
                <p className="text-sm break-all text-slate-300">
                  {shortenAddress(address!)}
                </p>
                <p className="text-sm text-green-500 mt-3">
                  Network: {chain?.name || "Unknown"}
                </p>
                <button
                  onClick={() => disconnect()}
                  className="text-red-400 text-sm pt-4 hover:underline"
                >
                  <FiLink className="inline-block mr-1 mb-1" size={14} />
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {isMounted && isWrongNetwork && isConnected && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 space-y-2">
              <p className="text-red-400 text-sm font-semibold">
                ⚠️ Wrong Network Detected
              </p>
              <p className="text-red-300 text-xs">
                Please switch to Avalanche Fuji Testnet to continue
              </p>
              <button
                onClick={handleSwitchNetwork}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-md text-sm transition-colors"
              >
                Switch to Avalanche Fuji
              </button>
            </div>
          )}

          <div className="border-t border-gray-700 pt-8 pb-4 space-y-2">
            <div className="flex justify-between gap-2">
              <p className="text-sm text-slate-300 font-semibold">
                CONTRACT VALUE (READ)
              </p>

              <button
                onClick={() => fetchBlockchainData()}
                disabled={isLoadingData}
                className="text-sm text-blue-500 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdRefresh
                  size={15}
                  className={isLoadingData ? "animate-spin" : ""}
                />
                Refresh value
              </button>
            </div>

            <div className="flex justify-center bg-linear-to-tl items-center py-10 from-[#0F172A] via-[#0B1220] to-[#020617] rounded-2xl ring-1 ring-slate-600">
              {isLoadingData ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : (
                <p className="text-6xl font-bold">{blockchainValue?.data?.value ?? "0"}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-300 font-semibold">
            UPDATE CONTRACT VALUE
          </p>

          <div className="flex flex-wrap gap-4 justify-center relative">
            <LuPencil className="absolute left-3 top-3 text-slate-400" />
            <input
              type="number"
              placeholder="New value"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTxPending || isWrongNetwork}
              className="bg-linear-to-br w-full pl-10 from-[#0B1A33] via-[#0a152b] to-[#0f1f3d] ring-1 ring-slate-600 px-8 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            />

            <button
              onClick={handleSetValue}
              disabled={isTxPending || !inputValue || isWrongNetwork}
              className={`w-full py-2 rounded font-bold flex justify-center items-center gap-2 transition-all
                ${
                  isTxPending || !inputValue || isWrongNetwork
                    ? "bg-gray-500 cursor-not-allowed opacity-50"
                    : "bg-[#4d7cfe] hover:opacity-80"
                }`}
            >
              {isWriting && <>Sending...</>}
              {isConfirming && <>Confirming...</>}
              {!isTxPending && (
                <>
                  {isWrongNetwork ? "Wrong Network" : "Set Value"}
                  <BsLightningChargeFill size={16} />
                </>
              )}
            </button>

            {hash && !isTxSuccess && !writeError && !confirmError && (
              <div className="w-full text-center">
                <p className="text-xs text-gray-400">
                  Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
                </p>
              </div>
            )}
          </div>

          <div className="bg-linear-to-br flex justify-center items-center from-[#0B1A33] via-[#0a152b] to-[#0f1f3d] py-3 rounded-md ring-1 ring-slate-600">
            <p className="text-xs text-gray-500 flex items-center gap-2 font-medium italic">
              <ShieldCheck size={14} />
              Smart contract = single source of truth
            </p>
          </div>

          {/* ==============================
            🔹 BLOCKCHAIN DATA SECTION
            ============================== */}
          {isMounted && (
            <div className="mt-8 space-y-4 border-t border-slate-600 pt-6">
              <h2 className="text-lg font-bold">Blockchain Data</h2>

              {isLoadingData ? (
                <div className="text-center py-4">
                  <p className="text-gray-400">Loading blockchain data...</p>
                </div>
              ) : blockchainValue === null || blockchainEvents === null ? (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 space-y-2">
                  <p className="text-red-400 text-sm font-semibold">
                    ⚠️ Error Loading Blockchain Data
                  </p>
                  <p className="text-red-300 text-xs">
                    Tidak dapat mengambil data dari backend. Pastikan:
                  </p>
                  <ul className="text-red-300 text-xs list-disc list-inside space-y-1">
                    <li>Backend server is running and reachable</li>
                    <li>Backend dapat terhubung ke blockchain RPC</li>
                    <li>Kontrak smart contract sudah ter-deploy</li>
                  </ul>
                  <button
                    onClick={() => {
                      const fetchBlockchainData = async () => {
                        try {
                          setIsLoadingData(true);
                          const value = await getBlockchainValue();
                          const events = await getBlockchainEvents();
                          if (value && value.data && typeof value.data.value !== 'undefined') {
                            setBlockchainValue(value);
                          }
                          if (events && events.data && Array.isArray(events.data)) {
                            setBlockchainEvents(events);
                          }
                        } catch (error: unknown) {
                          console.error("Error:", error);
                          const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
                          toast.error(errorMessage);
                        } finally {
                          setIsLoadingData(false);
                        }
                      };
                      fetchBlockchainData();
                    }}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-md text-sm transition-colors mt-2"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : (
                <>
                  <section className="bg-[#141b2d] p-4 rounded-xl ring-1 ring-slate-600">
                    <h3 className="font-semibold text-slate-300 mb-2">
                      Latest Value
                    </h3>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-48 bg-[#0a0f1d] p-3 rounded">
                      {JSON.stringify(blockchainValue, null, 2)}
                    </pre>
                  </section>

                  <section className="bg-[#141b2d] p-4 rounded-xl ring-1 ring-slate-600">
                    <h3 className="font-semibold text-slate-300 mb-2">
                      Events
                    </h3>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-48 bg-[#0a0f1d] p-3 rounded">
                      {JSON.stringify(blockchainEvents, null, 2)}
                    </pre>
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
