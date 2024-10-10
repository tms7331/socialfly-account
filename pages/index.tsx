import { useEffect, useState } from "react";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";
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

export default function Home() {
  const [message, handleMessage] = useState("");
  const [attId, handleAttId] = useState("");
  const [result, handleResult] = useState("");
  const [litNodeClient, handleLitNodeClient] = useState<LitJsSdk.LitNodeClient>();

  const { address } = useAccount();
  const chainId = useChainId();
  const schemaId = "0x300";

  const connect = async () => {
    const lnc = new LitJsSdk.LitNodeClient({
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

  const encrypt = async (message: string) => {
    if (!litNodeClient) {
      return {
        ciphertext: null,
        dataToEncryptHash: null
      };
    }

    // See more access control conditions here: https://developer.litprotocol.com/sdk/access-control/evm/basic-examples
    const accessControlConditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "eth_getBalance",
        parameters: [":userAddress", "latest"],
        returnValueTest: {
          comparator: ">=",
          value: "1000000000000" // 0.000001 ETH
        }
      }
    ];

    // Encrypt the message
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions,
        dataToEncrypt: message
      },
      litNodeClient
    );

    // Return the ciphertext and dataToEncryptHash
    return {
      ciphertext,
      dataToEncryptHash
    };
  };

  return (
    <div>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <ConnectButton />

        <input
          id="message"
          placeholder="Message to Encrypt"
          value={message}
          onChange={(e) => handleMessage(e.target.value)}
        />
        <button
          onClick={async () => {
            const { ciphertext, dataToEncryptHash } = await encrypt(message);
            if (ciphertext && dataToEncryptHash) {
              const client = new SignProtocolClient(SpMode.OnChain, {
                chain: EvmChains.baseSepolia
              });

              const res = await client.createAttestation({
                schemaId: schemaId,
                data: {
                  ciphertext,
                  dataToEncryptHash
                },
                indexingValue: address?.toLowerCase() ?? ""
              });
              handleResult(JSON.stringify(res));
            }
          }}
        >
          Encrypt
        </button>

        <input id="attId" placeholder="Attestation ID" value={attId} onChange={(e) => handleAttId(e.target.value)} />
        <button
          onClick={async () => {
            const { ciphertext, dataToEncryptHash } = await encrypt("Message!");
            if (ciphertext && dataToEncryptHash) {
              const indexingClient = new IndexService("testnet");
              const att = await indexingClient.queryAttestation(`onchain_evm_${chainId}_${attId}`);

              if (att) {
                const data = decodeOnChainData(att.data, DataLocationOnChain.ONCHAIN, att.schema.data as SchemaItem[]);

                fetch("http://localhost:8080/lit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data)
                })
                  .then((res) => res.json())
                  .then((result) => handleResult(JSON.stringify(result)));
              }
            }
          }}
        >
          Decrypt
        </button>

        <p className="break-all">{result}</p>
      </main>
    </div>
  );
}
