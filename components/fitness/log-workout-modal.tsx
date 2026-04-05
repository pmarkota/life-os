"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import type { Workout, WorkoutType, Exercise } from "@/types";

// ─── Exercise Presets ───────────────────────────────

const EXERCISE_PRESETS: Record<WorkoutType, string[]> = {
  push: [
    "Bench Press",
    "Incline Bench",
    "OHP",
    "Dips",
    "Tricep Pushdown",
    "Lateral Raise",
    "Cable Fly",
  ],
  pull: [
    "Deadlift",
    "Barbell Row",
    "Pull-ups",
    "Lat Pulldown",
    "Face Pull",
    "Bicep Curl",
    "Cable Row",
  ],
  legs: [
    "Squat",
    "Leg Press",
    "Romanian Deadlift",
    "Leg Extension",
    "Leg Curl",
    "Calf Raise",
    "Bulgarian Split Squat",
  ],
};

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

const WORKOUT_TYPE_COLORS: Record<WorkoutType, { active: string; border: string }> = {
  push: { active: "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30", border: "" },
  pull: { active: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30", border: "" },
  legs: { active: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30", border: "" },
};

// ─── Form Types ─────────────────────────────────────

interface ExerciseRow {
  id: string;
  name: string;
  customName: string;
  sets: string;
  reps: string;
  weight_kg: string;
  is_pr: boolean;
}

interface FormData {
  date: string;
  type: WorkoutType;
  exercises: ExerciseRow[];
  duration_minutes: string;
  notes: string;
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyExercise(): ExerciseRow {
  return {
    id: generateId(),
    name: "",
    customName: "",
    sets: "",
    reps: "",
    weight_kg: "",
    is_pr: false,
  };
}

const INITIAL_FORM: FormData = {
  date: todayISO(),
  type: "push",
  exercises: [createEmptyExercise()],
  duration_minutes: "",
  notes: "",
};

// ─── Props ──────────────────────────────────────────

interface LogWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkoutCreated: (workout: Workout) => void;
}

// ─── Component ──────────────────────────────────────

export function LogWorkoutModal({
  open,
  onOpenChange,
  onWorkoutCreated,
}: LogWorkoutModalProps) {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, date: todayISO() });
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateExercise<K extends keyof ExerciseRow>(
    id: string,
    key: K,
    value: ExerciseRow[K]
  ) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === id ? { ...ex, [key]: value } : ex
      ),
    }));
  }

  function addExercise() {
    setForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, createEmptyExercise()],
    }));
  }

  function removeExercise(id: string) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
  }

  function handleTypeSwitch(type: WorkoutType) {
    setForm((prev) => ({
      ...prev,
      type,
      exercises: prev.exercises.map((ex) => ({
        ...ex,
        name: "",
        customName: "",
      })),
    }));
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM, date: todayISO(), exercises: [createEmptyExercise()] });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validExercises = form.exercises.filter((ex) => {
      const name = ex.name === "__custom__" ? ex.customName.trim() : ex.name;
      return name && ex.sets && ex.reps && ex.weight_kg;
    });

    if (validExercises.length === 0) {
      toast.error("Add at least one complete exercise");
      return;
    }

    setSubmitting(true);

    const exercises: Exercise[] = validExercises.map((ex) => ({
      name: ex.name === "__custom__" ? ex.customName.trim() : ex.name,
      sets: parseInt(ex.sets, 10),
      reps: parseInt(ex.reps, 10),
      weight_kg: parseFloat(ex.weight_kg),
      is_pr: ex.is_pr,
    }));

    const payload = {
      date: form.date,
      type: form.type,
      exercises,
      duration_minutes: form.duration_minutes
        ? parseInt(form.duration_minutes, 10)
        : null,
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch("/api/fitness/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to log workout"
        );
      }

      const created: Workout = await res.json();
      onWorkoutCreated(created);
      resetForm();
      onOpenChange(false);
      toast.success(
        `${WORKOUT_TYPE_LABELS[form.type]} workout logged with ${exercises.length} exercise${exercises.length > 1 ? "s" : ""}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to log workout"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const currentPresets = EXERCISE_PRESETS[form.type];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl"
                  initial={{ scale: 0.95, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="sticky top-0 z-10 bg-[#18181B] border-b border-[#27272A] px-6 py-4 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-bold text-[#FAFAFA] tracking-tight">
                      Log Workout
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        className="rounded-lg p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors duration-150"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* Date */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Date
                      </Label>
                      <DatePicker
                        value={form.date || null}
                        onChange={(date) => updateField("date", date ?? todayISO())}
                        placeholder="Select date"
                      />
                    </div>

                    {/* Workout Type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Workout Type <span className="text-[#EF4444]">*</span>
                      </Label>
                      <div className="flex gap-2">
                        {(["push", "pull", "legs"] as WorkoutType[]).map(
                          (type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleTypeSwitch(type)}
                              className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                form.type === type
                                  ? WORKOUT_TYPE_COLORS[type].active
                                  : "bg-[#09090B] text-[#71717A] border-[#27272A] hover:border-[#3F3F46]"
                              }`}
                            >
                              {WORKOUT_TYPE_LABELS[type]}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Exercises */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Exercises <span className="text-[#EF4444]">*</span>
                      </Label>

                      {form.exercises.map((ex, idx) => (
                        <motion.div
                          key={ex.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-2.5 p-3 rounded-lg border border-[#27272A]/70 bg-[#09090B]/50"
                        >
                          {/* Exercise name select + remove */}
                          <div className="flex items-center gap-2">
                            <select
                              value={ex.name}
                              onChange={(e) =>
                                updateExercise(ex.id, "name", e.target.value)
                              }
                              className="flex-1 h-9 rounded-lg border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                            >
                              <option value="">Select exercise</option>
                              {currentPresets.map((preset) => (
                                <option key={preset} value={preset}>
                                  {preset}
                                </option>
                              ))}
                              <option value="__custom__">Custom...</option>
                            </select>
                            {form.exercises.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeExercise(ex.id)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#71717A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors duration-150"
                                aria-label="Remove exercise"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Custom name input */}
                          {ex.name === "__custom__" && (
                            <Input
                              value={ex.customName}
                              onChange={(e) =>
                                updateExercise(
                                  ex.id,
                                  "customName",
                                  e.target.value
                                )
                              }
                              placeholder="Exercise name"
                              className="h-9 bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                            />
                          )}

                          {/* Sets / Reps / Weight row */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-medium text-[#71717A] uppercase">
                                Sets
                              </span>
                              <Input
                                type="number"
                                min="1"
                                value={ex.sets}
                                onChange={(e) =>
                                  updateExercise(ex.id, "sets", e.target.value)
                                }
                                placeholder="5"
                                className="h-9 bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-medium text-[#71717A] uppercase">
                                Reps
                              </span>
                              <Input
                                type="number"
                                min="1"
                                value={ex.reps}
                                onChange={(e) =>
                                  updateExercise(ex.id, "reps", e.target.value)
                                }
                                placeholder="8"
                                className="h-9 bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-medium text-[#71717A] uppercase">
                                Weight (kg)
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={ex.weight_kg}
                                onChange={(e) =>
                                  updateExercise(
                                    ex.id,
                                    "weight_kg",
                                    e.target.value
                                  )
                                }
                                placeholder="100"
                                className="h-9 bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums text-center"
                              />
                            </div>
                          </div>

                          {/* PR checkbox */}
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border transition-all duration-150 ${
                                ex.is_pr
                                  ? "bg-[#F59E0B] border-[#F59E0B]"
                                  : "border-[#27272A] bg-[#09090B] group-hover:border-[#3F3F46]"
                              }`}
                              onClick={() =>
                                updateExercise(ex.id, "is_pr", !ex.is_pr)
                              }
                            >
                              {ex.is_pr && (
                                <svg
                                  className="h-2.5 w-2.5 text-[#09090B]"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                >
                                  <path
                                    d="M2.5 6L5 8.5L9.5 3.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs text-[#A1A1AA]">
                              Personal Record
                            </span>
                          </label>
                        </motion.div>
                      ))}

                      {/* Add Exercise */}
                      <button
                        type="button"
                        onClick={addExercise}
                        className="flex w-full items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-[#27272A] text-sm text-[#71717A] hover:text-[#A1A1AA] hover:border-[#3F3F46] transition-colors duration-150"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Exercise
                      </button>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Duration (minutes)
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.duration_minutes}
                        onChange={(e) =>
                          updateField("duration_minutes", e.target.value)
                        }
                        placeholder="60"
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Notes
                      </Label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        placeholder="How did it feel? Energy level, pump, etc."
                        rows={3}
                        className="flex w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200 resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="text-[#A1A1AA]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                      >
                        {submitting ? "Saving..." : "Log Workout"}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
