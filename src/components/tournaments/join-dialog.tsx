"use client";

import { useState, useEffect } from "react";
import { Loader2, Flag, ChevronLeft, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { WT_NATIONS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentTitle: string;
  defaultInGameName: string;
  defaultSquadron: string;
  onSubmit: (data: {
    in_game_name: string;
    squadron: string;
    country: string;
    vehicle: string;
  }) => Promise<void>;
};

export function JoinDialog({
  open,
  onOpenChange,
  tournamentTitle,
  defaultInGameName,
  defaultSquadron,
  onSubmit,
}: Props) {
  const [step, setStep] = useState<"form" | "terms">("form");
  const [inGameName, setInGameName] = useState(defaultInGameName);
  const [squadron, setSquadron] = useState(defaultSquadron);
  const [country, setCountry] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("form");
      setInGameName(defaultInGameName);
      setSquadron(defaultSquadron);
      setCountry("");
      setVehicle("");
      setAccepted(false);
    }
  }, [open, defaultInGameName, defaultSquadron]);

  const handleNext = () => {
    if (!inGameName.trim()) return;
    if (!country) return;
    if (!vehicle.trim()) return;
    setStep("terms");
  };

  const handleSubmit = async () => {
    if (!accepted) return;
    setSubmitting(true);
    await onSubmit({ in_game_name: inGameName.trim(), squadron: squadron.trim(), country, vehicle: vehicle.trim() });
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5" />
            {step === "form" ? "Join Tournament" : "Terms & Conditions"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Applying for: <span className="font-semibold text-foreground">{tournamentTitle}</span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="ign">In-Game Name *</Label>
              <Input
                id="ign"
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
                placeholder="Your War Thunder in-game name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="squad">Squadron</Label>
              <Input
                id="squad"
                value={squadron}
                onChange={(e) => setSquadron(e.target.value)}
                placeholder="e.g. SkyKnights (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Country *</Label>
              <div className="flex flex-wrap gap-1.5">
                {WT_NATIONS.map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCountry(code)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-colors cursor-pointer",
                      country === code
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    <Flag className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle *</Label>
              <Input
                id="vehicle"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="e.g. Leopard 2A7V"
              />
              <p className="text-xs text-muted-foreground">
                Please write the vehicle name as it appears in the game
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleNext} disabled={!inGameName.trim() || !country || !vehicle.trim()}>
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto rounded border bg-muted/30 p-4 text-sm space-y-3">
              <p>
                By applying to this tournament, you agree to the following terms and conditions:
              </p>
              <ol className="list-decimal pl-4 space-y-2">
                <li>You must be available during the tournament dates and times.</li>
                <li>All vehicles and lineups must comply with the specified Battle Rating and tier restrictions.</li>
                <li>Any form of cheating, exploiting, or unsportsmanlike behavior will result in immediate disqualification.</li>
                <li>The tournament organizers reserve the right to make final decisions on any disputes.</li>
                <li>Your in-game name and squadron information will be shared with other participants for match coordination.</li>
                <li>False or misleading information in your application may result in rejection or removal from the tournament.</li>
              </ol>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm">
                I have read and agree to the terms and conditions
              </span>
            </label>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("form")}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={!accepted || submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
