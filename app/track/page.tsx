"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// §9.2 /track — Complaint ID → plain-language status timeline. Entry screen
// only; the lookup/OTP/timeline state machine lives at /track/[publicId] so
// the case has a real, shareable, bookmarkable URL (§9.3).
export default function TrackEntryPage() {
  const router = useRouter();
  const [complaintId, setComplaintId] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = complaintId.trim();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Track your complaint</CardTitle>
          <CardDescription>
            Enter the Complaint ID you were given when you reported. We&apos;ll
            send a verification code to the mobile number on file before
            showing any case details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="complaint-id">Complaint ID</Label>
              <Input
                id="complaint-id"
                name="complaintId"
                autoComplete="off"
                autoFocus
                placeholder="e.g. CYB2026AB12CD"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!complaintId.trim()}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
