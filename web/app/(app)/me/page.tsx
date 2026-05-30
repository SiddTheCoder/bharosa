"use client";

import { CheckCircle2, Loader2, Mic, PiggyBank, Send, ShieldCheck, Sparkles, Square, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Question = {
  id: string;
  trait: string;
  reverse_coded: boolean;
  text_en: string;
  text_ne: string;
};

type AnswerResult = {
  transcript: string;
  score: number;
  reliability: number;
  passport: { confidence: number };
};

// Human-friendly framing for the two traits the interview measures.
const TRAITS: Record<string, { label: string; icon: typeof Target }> = {
  conscientiousness: { label: "Planning & follow-through", icon: Target },
  risk_aversion: { label: "Care with money", icon: PiggyBank }
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function MePage() {
  const { idToken } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [confidence, setConfidence] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    apiGet<{ questions: Question[] }>("/interview/questions", idToken)
      .then((res) => setQuestions(res.questions ?? []))
      .catch(() => toast.message("Could not load interview questions"));
  }, [idToken]);

  const question = questions[index];
  const done = questions.length > 0 && index >= questions.length;
  const trait = question ? TRAITS[question.trait] : null;

  async function send(payload: { text?: string; audio_b64?: string; audio_mime?: string }) {
    if (!question) return;
    setBusy(true);
    try {
      const res = await apiPost<AnswerResult>(
        "/me/interview/answer",
        { question_id: question.id, ...payload },
        idToken
      );
      setResult(res);
      const c = res.passport?.confidence ?? 0;
      setConfidence(Math.round(c > 1 ? c : c * 100));
      setText("");
      toast.success("Answer recorded — confidence updated");
      setIndex((i) => i + 1);
    } catch {
      toast.error("Could not submit that answer");
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audio_b64 = await blobToBase64(blob);
        await send({ audio_b64, audio_mime: "audio/webm" });
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone unavailable — type your answer instead");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  const progress = questions.length ? Math.round((index / questions.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Business interview</h1>
        <p className="text-muted-foreground">
          A few short questions about how you run your business. There are no right or wrong answers — just answer honestly.
        </p>
      </div>

      {/* ── Intro / start screen ─────────────────────────────────────── */}
      {!started && !done ? (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary" /> तपाईंको भरोसा / Your Trust</CardTitle>
            <p className="text-sm text-muted-foreground">Speak in Nepali, or type — whichever is easier for you.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-lg bg-muted/40 p-3 text-sm leading-6">
              Lenders can&apos;t see how carefully you plan and handle money — so we ask. Your answers add a private signal
              that lifts your trust score. Nothing here is shared publicly.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.values(TRAITS).map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                  {label}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> About {questions.length || 6} questions · 2 minutes · private to you
            </div>
            <Button className="w-full" disabled={!questions.length} onClick={() => setStarted(true)}>
              {questions.length ? "Start the interview" : <Loader2 className="animate-spin" />}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Active interview ─────────────────────────────────────────── */}
      {started && !done ? (
        <Card className="glass">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Question {index + 1} of {questions.length}</span>
              <span className="flex items-center gap-1 text-primary"><Sparkles className="size-3.5" /> {confidence}% confidence</span>
            </div>
            <Progress value={progress} />
            {trait ? (
              <Badge variant="secondary" className="w-fit gap-1">
                <trait.icon className="size-3.5" /> {trait.label}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {question ? (
              <>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-lg leading-8">{question.text_ne}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{question.text_en}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recording ? (
                    <Button variant="destructive" onClick={stopRecording} disabled={busy}>
                      <Square /> Stop & submit
                    </Button>
                  ) : (
                    <Button onClick={startRecording} disabled={busy}>
                      {busy ? <Loader2 className="animate-spin" /> : <Mic />} Record answer
                    </Button>
                  )}
                  {recording ? <span className="flex items-center gap-2 text-sm text-destructive"><span className="size-2 animate-pulse rounded-full bg-destructive" /> Listening…</span> : null}
                </div>

                <div className="relative">
                  <span className="mb-1.5 block text-xs text-muted-foreground">…or type your answer</span>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your answer in Nepali or English"
                    disabled={recording || busy}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => send({ text })}
                  disabled={!text.trim() || recording || busy}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <Send />} Submit answer
                </Button>
              </>
            ) : (
              <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            )}

            {result ? (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-primary" /> We heard</p>
                <p className="mt-1 leading-6">{result.transcript}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ── Completion ───────────────────────────────────────────────── */}
      {done ? (
        <Card className="glass">
          <CardContent className="space-y-4 p-6 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="size-7" /></span>
            <div>
              <h2 className="text-xl font-semibold">धन्यवाद! Interview complete</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Thank you for answering honestly. Your trust confidence is now <span className="font-medium text-foreground">{confidence}%</span> and will keep climbing as you add more records.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
