"use client";
import {
  ThirdwebProvider,
  useContract,
  useAddress,
  ConnectWallet,
  useStorageUpload,
  useContractEvents,
} from "@thirdweb-dev/react";
import { PolygonAmoyTestnet } from "@thirdweb-dev/chains";
import React, { useState, useEffect, useRef } from "react";
import "../app/globals.css";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID as string;

function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { contract } = useContract(CONTRACT_ADDRESS);
  const address = useAddress();
  const { mutateAsync: upload } = useStorageUpload();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => {
          if (prevTime >= 60) {
            stopRecording();
            return 60;
          }
          return prevTime + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () =>
        setAudioBlob(new Blob(chunks, { type: "audio/webm" }));

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadToIPFS = async (blob: Blob) => {
    try {
      const file = new File([blob], "audio.webm", { type: "audio/webm" });
      const uris = await upload({ data: [file] });
      return uris[0];
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      return null;
    }
  };

  const postAudio = async () => {
    if (!audioBlob || !contract || !address) return;

    try {
      const ipfsUri = await uploadToIPFS(audioBlob);
      if (!ipfsUri) throw new Error("Failed to upload to IPFS");

      // Use the contract.call method for write operations
      const tx = await contract.call("setAudio", [ipfsUri, recordingTime]);

      console.log("Audio posted successfully!", tx);

      // Optionally, you can get the transaction receipt if needed
      // const receipt = await tx.receipt;
      // console.log("Transaction receipt:", receipt);
    } catch (error) {
      console.error("Error posting audio:", error);
    }
  };

  return (
    <div className="flex-col flex md:flex-row gap-2 md:justify-between md:w-full items-center">
      <button
        className="bg-black rounded-md p-4 py-2 text-white"
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      <p>Recording Time: {recordingTime}s</p>
      {audioBlob && (
        <button
          className="bg-violet-400 rounded-md px-4 py-2"
          onClick={postAudio}
        >
          Post Audio
        </button>
      )}
    </div>
  );
}

function AudioFeed() {
  const { contract } = useContract(CONTRACT_ADDRESS);
  const {
    data: events,
    isLoading,
    error,
  } = useContractEvents(contract, "AudioUploaded");

  if (isLoading) {
    return <div>Loading audio feed...</div>;
  }

  if (error) {
    // Type guard for error object
    if (error instanceof Error) {
      return <div>Error loading audio feed: {error.message}</div>;
    }
    return <div>Error loading audio feed</div>;
  }

  return (
    <div className="divider-x divide-gray-400 p-2 md:p-4 overflow-x-hidden overflow-y-scroll flex-col flex gap-2">
      <h2 className="text-2xl mt-4">Audio Feed</h2>
      {events?.map((event, index) => (
        <div
          key={index}
          className="p-0 md:p-2 flex flex-col gap-2 rounded-xl border-2 shadow-sm shadow-black"
        >
          <p className="block md:hidden text-black font-medium">
            User:{" "}
            {`${event.data.user.slice(0, 3)}...${event.data.user.slice(-4)}`}
          </p>
          <p className="hidden md:block text-black font-medium">
            User: {event.data.user}
          </p>
          <div
            id="media-renderer"
            className="mt-2 text-right flex flex-col items-start justify-start w-full"
          >
            <audio
              className="w-full"
              controls
              src={`https://ipfs.io/ipfs/${event.data.audioHash.replace(/^ipfs:\/\//, "")}`}
            ></audio>
          </div>
          <p>Duration: {event.data.duration.toString()}s</p>
          <p>
            Posted at:{" "}
            {new Date(event.data.timestamp.toNumber() * 1000).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function MainContent() {
  return (
    <div className="grid p-6 md:p-12 text-black gap-2 bg-white rounded-xl w-full shadow-xl border-2 z-10 my-2 md:my-4 h-md overflow-x-hidden">
      <div className="flex w-full justify-between gap-4 items-center">
        <h1 className="text-black text-xl md:text-4xl font-medium">
          Social Audio Platform
        </h1>
        <ConnectWallet />
      </div>
      <div>
        <AudioRecorder />
      </div>
      <hr className="text-xl" />
      <AudioFeed />
    </div>
  );
}

export default function Home() {
  return (
    <ThirdwebProvider clientId={CLIENT_ID} activeChain={PolygonAmoyTestnet}>
      <BackgroundGradientAnimation className="grid place-content-center p-6 md:p-12 h-full overflow-hidden">
        <MainContent />
      </BackgroundGradientAnimation>
    </ThirdwebProvider>
  );
}
