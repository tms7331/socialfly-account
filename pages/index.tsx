"use client"
import { useEffect, useState } from "react";
// import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitNodeClient, encryptString, encryptFile, decryptToString } from "@lit-protocol/lit-node-client";
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import {
  SignProtocolClient,
  SpMode,
  EvmChains,
  IndexService,
  decodeOnChainData,
  DataLocationOnChain,
  chainInfo,
  SchemaItem
} from "@ethsign/sp-sdk";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import {
  createSiweMessage,
  generateAuthSig,
  LitAbility,
  LitAccessControlConditionResource,
} from "@lit-protocol/auth-helpers";


import { ethers } from 'ethers';


//const schemaId = "0x300";
const schemaId = "0x381";
const schemaId_full = "onchain_evm_84532_0x381";
const indexingValue = "socialfly_app_0";

const ONE_WEEK_FROM_NOW = new Date(
  Date.now() + 1000 * 60 * 60 * 24 * 7
).toISOString();

const genWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const ethersSigner = provider.getSigner();
    return ethersSigner;
  } else {
    console.error("MetaMask is not installed!");
    throw new Error("MetaMask is not installed");
  }
}



const genAuthSig = async (
  wallet: ethers.Signer,
  client: LitNodeClient,
  uri: string,
  resources: LitResourceAbilityRequest[]
) => {
  const address = await wallet.getAddress();
  console.log("genAuthSig address: ", address);

  const blockHash = await client.getLatestBlockhash();
  const message = await createSiweMessageWithRecaps({
    walletAddress: address,
    nonce: blockHash,
    litNodeClient: client,
    resources,
    expiration: ONE_WEEK_FROM_NOW,
    uri
  })
  const authSig = await generateAuthSig({
    signer: wallet,
    toSign: message,
    address: address
  });
  return authSig;
}

const genSession = async (
  wallet: ethers.Signer,
  client: LitNodeClient,
  resources: LitResourceAbilityRequest[]) => {
  const sessionSigs = await client.getSessionSigs({
    chain: "ethereum",
    resourceAbilityRequests: resources,
    authNeededCallback: async (params: AuthCallbackParams) => {
      if (!params.expiration) {
        throw new Error("expiration is required");
      }
      if (!params.resources) {
        throw new Error("resourceAbilityRequests is required");
      }
      if (!params.uri) {
        throw new Error("uri is required");
      }
      const authSig = genAuthSig(wallet, client, params.uri, params.resourceAbilityRequests ?? []);
      return authSig;
    }
  });

  return sessionSigs;
}




export default function Home() {
  const [message, handleMessage] = useState("");
  const [pubkey, handlePubkey] = useState("");
  const [attId, handleAttId] = useState("");
  const [result, handleResult] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [litNodeClient, handleLitNodeClient] = useState<LitNodeClient>();

  const { address } = useAccount();
  const chainId = useChainId();

  //const PK = process.env.NEXT_PUBLIC_PK;
  //   const ethersWallet = new ethers.Wallet(
  //     PK, // Make sure to set this in your .env file
  //     new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
  //   );
  // const accessControlConditions = [
  //   {
  //     contractAddress: "0x4d2C7E3F9e498EdaCbAa99C613C1b89b9B218877",
  //     standardContractType: "",
  //     chain: "ethereum",
  //     method: "getApproval",
  //     parameters: [":userAddress"],
  //     returnValueTest: {
  //       comparator: "=",
  //       value: ethersWallet.address,
  //     },
  //   },
  // ];

  //   const accessControlConditions = [
  //     {
  //       contractAddress: "0x4d2C7E3F9e498EdaCbAa99C613C1b89b9B218877",
  //       standardContractType: "",
  //       chain: "sepolia",
  //       method: "getApprovalOk",
  //       parameters: [":userAddress", "0x4d2C7E3F9e498EdaCbAa99C613C1b89b9B218877", "abcdefg"],
  //       //functionAbi:
  //       //{
  //       //  "type": "function",
  //       //  "name": "getApprovalOk",
  //       //  "stateMutability": "view",
  //       //  "inputs": [{ "name": "caller", "type": "address", "internalType": "address" },
  //       //  { "name": "hardcodedAddress", "type": "address", "internalType": "address" },
  //       //  { "name": "ipfsCid", "type": "string", "internalType": "string" }],
  //       //  "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }]
  //       //},
  //       returnValueTest: {
  //         comparator: '=',
  //         value: 'true'
  //       },
  //     },
  //   ];

  const accessControlConditions = [
    {
      contractAddress: '',
      standardContractType: '',
      chain: 'sepolia',
      method: 'eth_getBalance',
      parameters: [
        ':userAddress',
        'latest'
      ],
      returnValueTest: {
        comparator: '>=',
        value: '0'
      }
    }
  ]


  const connect = async () => {
    const lnc = new LitNodeClient({
      litNetwork: LitNetwork.DatilDev
    });
    handleLitNodeClient(lnc);
    await lnc.connect();
  };

  useEffect(() => {
    connect();
    return () => {
      if (litNodeClient) litNodeClient.disconnect();
    };
  }, []);

  const encryptStringLit = async (message: string) => {
    if (!litNodeClient) {
      return {
        ciphertext: null,
        dataToEncryptHash: null
      };
    }
    const { ciphertext, dataToEncryptHash } = await encryptString(
      {
        accessControlConditions,
        dataToEncrypt: message
      },
      litNodeClient
    );
    return {
      ciphertext,
      dataToEncryptHash
    };
  };


  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const uploadImage = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      // Generate a unique file name using the current timestamp
      // const fileName = `${Date.now()}-${file.name}`;
      const { ciphertext, dataToEncryptHash } = await encryptFile(
        {
          accessControlConditions,
          file: file,
          chain: "ethereum"
        },
        litNodeClient!
      );

      console.log("ciphertext: ", ciphertext);
      if (ciphertext && dataToEncryptHash) {
        const client = new SignProtocolClient(SpMode.OnChain, {
          chain: EvmChains.baseSepolia
        });

        // profile photo
        // https://testnet-scan.sign.global/schema/onchain_evm_84532_0x388
        const profilePhotoSchemaId = "0x388";
        const res = await client.createAttestation({
          schemaId: profilePhotoSchemaId,
          data: {
            ciphertext,
            dataToEncryptHash
          },
          indexingValue: indexingValue
        });
        handleResult(JSON.stringify(res));
      }


    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <ConnectButton />



        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button onClick={uploadImage} disabled={loading || !file}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>


        <input
          id="message"
          placeholder="Encrypt bio..."
          value={message}
          onChange={(e) => handleMessage(e.target.value)}
          className="text-black p-2 border rounded"
        />
        <button
          onClick={async () => {
            const { ciphertext, dataToEncryptHash } = await encryptStringLit(message);
            if (ciphertext && dataToEncryptHash) {
              const client = new SignProtocolClient(SpMode.OnChain, {
                chain: EvmChains.baseSepolia
              });

              // Bio
              // https://testnet-scan.sign.global/schema/onchain_evm_84532_0x389
              const bioSchemaId = "0x389";
              const res = await client.createAttestation({
                schemaId: bioSchemaId,
                data: {
                  ciphertext,
                  dataToEncryptHash
                },
                indexingValue: indexingValue
              });
              handleResult(JSON.stringify(res));
            }
          }}
        >
          Encrypt Bio
        </button>


        <button
          onClick={async () => {

            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
            } else {
              console.error("Geolocation is not supported by this browser.");
            }

            async function successCallback(position) {
              const latitude = position.coords.latitude;
              const longitude = position.coords.longitude;
              console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

              const locationMessage = JSON.stringify({
                latitude,
                longitude
              });

              const { ciphertext, dataToEncryptHash } = await encryptStringLit(locationMessage);
              console.log("ciphertext: ", ciphertext);
              if (ciphertext && dataToEncryptHash) {
                const client = new SignProtocolClient(SpMode.OnChain, {
                  chain: EvmChains.baseSepolia
                });

                // Location
                // https://testnet-scan.sign.global/schema/onchain_evm_84532_0x38b
                const locSchemaId = "0x38b";
                const res = await client.createAttestation({
                  schemaId: locSchemaId,
                  data: {
                    ciphertext,
                    dataToEncryptHash
                  },
                  indexingValue: indexingValue
                });
                handleResult(JSON.stringify(res));
              }
            }

            function errorCallback(error) {
              console.error(`Error: ${error.message}`);
            }
          }}
        >
          Encrypt Location Data
        </button>

        <input
          id="pubkey"
          placeholder="Encrypt pubkey..."
          value={pubkey}
          onChange={(e) => handlePubkey(e.target.value)}
          className="text-black p-2 border rounded"
        />
        <button
          onClick={async () => {
            // pubkey
            // https://testnet-scan.sign.global/schema/onchain_evm_84532_0x38c
            const bioSchemaId = "0x38c";

            const client = new SignProtocolClient(SpMode.OnChain, {
              chain: EvmChains.baseSepolia
            });
            const res = await client.createAttestation({
              schemaId: bioSchemaId,
              data: {
                pubkey,
              },
              indexingValue: indexingValue
            });
            handleResult(JSON.stringify(res));
          }}
        >
          Encrypt Pubkey
        </button>

        <input
          id="attId"
          placeholder="Attestation ID"
          value={attId}
          onChange={(e) => handleAttId(e.target.value)}
          className="text-black p-2 border rounded"
        />
        <button
          onClick={async () => {
            const client = new SignProtocolClient(SpMode.OnChain, {
              chain: EvmChains.baseSepolia
            });

            const revokeAttestationRes = await client.revokeAttestation(attId, {
              reason: "updated",
            });
            console.log(revokeAttestationRes)

          }}
        >
          Revoke Attestation
        </button>

        <p className="break-all">Result: {result}</p>
      </main>
    </div >
  );
}
