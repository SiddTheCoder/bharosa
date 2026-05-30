"use client";

import { Camera, RotateCcw, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SelfieCapture({ onCapture }: { onCapture: (file: File | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }

  useEffect(() => () => stopStream(), []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
    } catch {
      toast.error("Camera unavailable — use the upload option instead");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      onCapture(file);
      setPreview(URL.createObjectURL(blob));
      stopStream();
    }, "image/jpeg", 0.9);
  }

  function retake() {
    setPreview(null);
    onCapture(null);
    start();
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selfie preview" className="size-full object-cover" />
        ) : (
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
        )}
      </div>
      <div className="flex gap-2">
        {preview ? (
          <Button type="button" variant="outline" onClick={retake}><RotateCcw /> Retake</Button>
        ) : live ? (
          <Button type="button" onClick={capture}><Camera /> Capture selfie</Button>
        ) : (
          <Button type="button" onClick={start}><Video /> Start camera</Button>
        )}
      </div>
    </div>
  );
}
