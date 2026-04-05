"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type KeyboardEvent,
  type ChangeEvent,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  Monitor,
  RotateCcw,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  AtSign,
  Globe,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import type {
  Lead,
  LeadStatus,
  LeadNiche,
  LeadChannel,
  LeadMarket,
  SubscriptionTier,
  OutreachLog,
  OutreachType,
} from "@/types";

// ============================================================
// Constants
// ============================================================

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "demo_built", label: "Demo Built" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "call_booked", label: "Call Booked" },
  { value: "follow_up", label: "Follow-up" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const NICHE_OPTIONS: { value: LeadNiche; label: string }[] = [
  { value: "dental", label: "Dental" },
  { value: "frizer", label: "Frizer" },
  { value: "restoran", label: "Restoran" },
  { value: "autoservis", label: "Autoservis" },
  { value: "fizioterapija", label: "Fizioterapija" },
  { value: "wellness", label: "Wellness" },
  { value: "fitness", label: "Fitness" },
  { value: "apartmani", label: "Apartmani" },
  { value: "kozmetika", label: "Kozmetika" },
  { value: "pekara", label: "Pekara" },
  { value: "ostalo", label: "Ostalo" },
];

const CHANNEL_OPTIONS: { value: LeadChannel; label: string }[] = [
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "telefon", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "osobno", label: "Osobno" },
];

const MARKET_OPTIONS: { value: LeadMarket; label: string }[] = [
  { value: "hr", label: "Croatia (HR)" },
  { value: "dach", label: "DACH" },
  { value: "us", label: "US" },
];

const TIER_OPTIONS: { value: SubscriptionTier; label: string }[] = [
  { value: "basic_79", label: "Basic (79 EUR)" },
  { value: "standard_99", label: "Standard (99 EUR)" },
  { value: "custom", label: "Custom" },
];

const OUTREACH_TYPES: { value: OutreachType; label: string; icon: typeof Mail }[] = [
  { value: "email", label: "Email", icon: Mail },
  { value: "call", label: "Call", icon: Phone },
  { value: "demo", label: "Demo", icon: Monitor },
  { value: "follow_up", label: "Follow-up", icon: RotateCcw },
];

const STATUS_COLOR_MAP: Record<LeadStatus, string> = {
  new: "bg-[#0EA5E9]/15 text-[#0EA5E9]",
  demo_built: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
  contacted: "bg-[#3B82F6]/15 text-[#3B82F6]",
  replied: "bg-[#F59E0B]/15 text-[#F59E0B]",
  call_booked: "bg-[#06B6D4]/15 text-[#06B6D4]",
  follow_up: "bg-[#F97316]/15 text-[#F97316]",
  won: "bg-[#22C55E]/15 text-[#22C55E]",
  lost: "bg-[#EF4444]/15 text-[#EF4444]",
};

const OUTREACH_ICON_BG: Record<OutreachType, string> = {
  email: "bg-[#0EA5E9]/15 text-[#0EA5E9]",
  call: "bg-[#22C55E]/15 text-[#22C55E]",
  demo: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
  follow_up: "bg-[#F59E0B]/15 text-[#F59E0B]",
};

const OUTREACH_ICON_MAP: Record<OutreachType, typeof Mail> = {
  email: Mail,
  call: Phone,
  demo: Monitor,
  follow_up: RotateCcw,
};

// ============================================================
// Helpers
// ============================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Convert a Date-like value to YYYY-MM-DD for date inputs */
function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Copy button
// ============================================================

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className="p-1 rounded text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#27272A]/50 transition-colors duration-150 shrink-0"
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#22C55E]" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ============================================================
// Props
// ============================================================

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdate: (updatedLead: Lead) => void;
  onLeadDelete: (leadId: string) => void;
}

// ============================================================
// Inline field components
// ============================================================

/** Tracks which field is currently saving. Used to show a tiny spinner. */
type SavingField = string | null;

interface InlineFieldShellProps {
  label: string;
  fieldName: string;
  savingField: SavingField;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

function InlineFieldShell({ label, fieldName, savingField, children, className, actions }: InlineFieldShellProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
          {label}
        </p>
        {savingField === fieldName && (
          <Loader2 className="w-3 h-3 text-[#0EA5E9] animate-spin" />
        )}
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// --- InlineText ---

interface InlineTextProps {
  label: string;
  fieldName: string;
  value: string | null;
  savingField: SavingField;
  onSave: (fieldName: string, value: string | null) => void;
  placeholder?: string;
  className?: string;
}

function InlineText({ label, fieldName, value, savingField, onSave, placeholder, className }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const newVal = draft.trim() || null;
    if (newVal !== (value ?? null)) {
      onSave(fieldName, newVal);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setDraft(value ?? "");
      setEditing(false);
    }
  }

  return (
    <InlineFieldShell label={label} fieldName={fieldName} savingField={savingField} className={className}>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[#FAFAFA] border-b border-[#0EA5E9] outline-none py-0.5 placeholder:text-[#52525B]"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left text-sm text-[#FAFAFA] hover:bg-[#27272A]/50 rounded px-1 -mx-1 py-0.5 transition-colors duration-100 cursor-text min-h-[1.5rem]"
        >
          {value || <span className="text-[#52525B]">{placeholder ?? "\u2014"}</span>}
        </button>
      )}
    </InlineFieldShell>
  );
}

// --- InlineEmail ---

interface InlineLinkFieldProps {
  label: string;
  fieldName: string;
  value: string | null;
  savingField: SavingField;
  onSave: (fieldName: string, value: string | null) => void;
  type: "email" | "phone" | "url" | "instagram";
  className?: string;
  copyable?: boolean;
  copyLabel?: string;
}

function InlineLinkField({ label, fieldName, value, savingField, onSave, type, className, copyable, copyLabel }: InlineLinkFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const newVal = draft.trim() || null;
    if (newVal !== (value ?? null)) {
      onSave(fieldName, newVal);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setDraft(value ?? "");
      setEditing(false);
    }
  }

  function getHref(): string | null {
    if (!value) return null;
    switch (type) {
      case "email":
        return `mailto:${value}`;
      case "phone":
        return `tel:${value}`;
      case "url":
        return value.startsWith("http") ? value : `https://${value}`;
      case "instagram":
        return `https://instagram.com/${value.replace(/^@/, "")}`;
    }
  }

  function getIcon() {
    switch (type) {
      case "email":
        return <Mail className="w-3 h-3 shrink-0" />;
      case "phone":
        return <Phone className="w-3 h-3 shrink-0" />;
      case "url":
        return <Globe className="w-3 h-3 shrink-0" />;
      case "instagram":
        return <AtSign className="w-3 h-3 shrink-0" />;
    }
  }

  const inputType = type === "email" ? "email" : type === "phone" ? "tel" : type === "url" ? "url" : "text";
  const placeholder = type === "email" ? "email@example.com" : type === "phone" ? "+385..." : type === "url" ? "https://..." : "@handle";
  const href = getHref();

  return (
    <InlineFieldShell label={label} fieldName={fieldName} savingField={savingField} className={className}>
      {editing ? (
        <input
          ref={inputRef}
          type={inputType}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[#FAFAFA] border-b border-[#0EA5E9] outline-none py-0.5 placeholder:text-[#52525B]"
        />
      ) : (
        <div className="flex items-center gap-1.5 min-h-[1.5rem]">
          {value ? (
            <>
              <a
                href={href ?? "#"}
                target={type === "url" || type === "instagram" ? "_blank" : undefined}
                rel={type === "url" || type === "instagram" ? "noopener noreferrer" : undefined}
                className="text-sm text-[#0EA5E9] hover:underline flex items-center gap-1.5 truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {getIcon()}
                <span className="truncate">{value}</span>
                {(type === "url" || type === "instagram") && <ExternalLink className="w-3 h-3 shrink-0" />}
              </a>
              {copyable && value && (
                <CopyButton text={value} label={copyLabel ?? label} />
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ml-auto text-[#52525B] hover:text-[#A1A1AA] transition-colors p-0.5 rounded shrink-0"
                aria-label={`Edit ${label}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full text-left text-sm text-[#52525B] hover:bg-[#27272A]/50 rounded px-1 -mx-1 py-0.5 transition-colors duration-100 cursor-text"
            >
              {placeholder}
            </button>
          )}
        </div>
      )}
    </InlineFieldShell>
  );
}

// --- InlineSelect ---

interface InlineSelectProps<T extends string> {
  label: string;
  fieldName: string;
  value: T | null;
  options: { value: T; label: string }[];
  savingField: SavingField;
  onSave: (fieldName: string, value: T | null) => void;
  colorMap?: Record<string, string>;
  className?: string;
}

function InlineSelect<T extends string>({
  label,
  fieldName,
  value,
  options,
  savingField,
  onSave,
  colorMap,
  className,
}: InlineSelectProps<T>) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  function commit(e: ChangeEvent<HTMLSelectElement>) {
    const newVal = (e.target.value || null) as T | null;
    setEditing(false);
    if (newVal !== value) {
      onSave(fieldName, newVal);
    }
  }

  function handleBlur() {
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLSelectElement>) {
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  const displayLabel = value ? (options.find((o) => o.value === value)?.label ?? value) : null;
  const badgeColor = value && colorMap ? colorMap[value] : undefined;

  return (
    <InlineFieldShell label={label} fieldName={fieldName} savingField={savingField} className={className}>
      {editing ? (
        <select
          ref={selectRef}
          value={value ?? ""}
          onChange={commit}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#09090B] text-sm text-[#FAFAFA] border border-[#27272A] rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[#0EA5E9]"
        >
          <option value="">None</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left hover:bg-[#27272A]/50 rounded px-1 -mx-1 py-0.5 transition-colors duration-100 cursor-pointer min-h-[1.5rem]"
        >
          {displayLabel ? (
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                badgeColor ?? "bg-[#27272A] text-[#A1A1AA]"
              }`}
            >
              {displayLabel}
            </span>
          ) : (
            <span className="text-sm text-[#52525B]">{"\u2014"}</span>
          )}
        </button>
      )}
    </InlineFieldShell>
  );
}

// --- InlineDate ---

interface InlineDateProps {
  label: string;
  fieldName: string;
  value: string | null;
  savingField: SavingField;
  onSave: (fieldName: string, value: string | null) => void;
  className?: string;
}

function InlineDate({ label, fieldName, value, savingField, onSave, className }: InlineDateProps) {
  const handleChange = useCallback(
    (date: string | null) => {
      const oldVal = toDateInputValue(value) || null;
      if (date !== oldVal) {
        onSave(fieldName, date ? new Date(date).toISOString() : null);
      }
    },
    [fieldName, value, onSave],
  );

  return (
    <InlineFieldShell label={label} fieldName={fieldName} savingField={savingField} className={className}>
      <DatePicker
        value={toDateInputValue(value) || null}
        onChange={handleChange}
        placeholder="\u2014"
        className="w-full"
      />
    </InlineFieldShell>
  );
}

// --- InlineNumber ---

interface InlineNumberProps {
  label: string;
  fieldName: string;
  value: number | null;
  savingField: SavingField;
  onSave: (fieldName: string, value: number | null) => void;
  placeholder?: string;
  className?: string;
}

function InlineNumber({ label, fieldName, value, savingField, onSave, placeholder, className }: InlineNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value !== null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value !== null ? String(value) : "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    const newVal = trimmed === "" ? null : Number(trimmed);
    if (newVal !== value) {
      onSave(fieldName, newVal);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setDraft(value !== null ? String(value) : "");
      setEditing(false);
    }
  }

  return (
    <InlineFieldShell label={label} fieldName={fieldName} savingField={savingField} className={className}>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[#FAFAFA] border-b border-[#0EA5E9] outline-none py-0.5 placeholder:text-[#52525B] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left text-sm text-[#FAFAFA] hover:bg-[#27272A]/50 rounded px-1 -mx-1 py-0.5 transition-colors duration-100 cursor-text min-h-[1.5rem]"
        >
          {value !== null ? String(value) : <span className="text-[#52525B]">{placeholder ?? "\u2014"}</span>}
        </button>
      )}
    </InlineFieldShell>
  );
}

// --- InlineTextarea ---

interface InlineTextareaProps {
  label: string;
  fieldName: string;
  value: string | null;
  savingField: SavingField;
  onSave: (fieldName: string, value: string | null) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  copyable?: boolean;
  copyLabel?: string;
}

function InlineTextarea({
  label,
  fieldName,
  value,
  savingField,
  onSave,
  placeholder,
  className,
  minRows = 3,
  copyable,
  copyLabel,
}: InlineTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      autoResize(textareaRef.current);
    }
  }, [editing]);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function commit() {
    setEditing(false);
    const newVal = draft.trim() || null;
    if (newVal !== (value ?? null)) {
      onSave(fieldName, newVal);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      setDraft(value ?? "");
      setEditing(false);
    }
    // Enter without shift = normal newline in textarea; no special handling
  }

  return (
    <InlineFieldShell
      label={label}
      fieldName={fieldName}
      savingField={savingField}
      className={className}
      actions={copyable && value ? <CopyButton text={value} label={copyLabel ?? label} /> : undefined}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoResize(e.target);
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={minRows}
          className="w-full bg-[#09090B] text-sm text-[#FAFAFA] border border-[#27272A] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#0EA5E9] placeholder:text-[#52525B] resize-none leading-relaxed"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left text-sm text-[#A1A1AA] hover:bg-[#27272A]/50 rounded px-1 -mx-1 py-0.5 transition-colors duration-100 cursor-text min-h-[2.5rem] whitespace-pre-wrap leading-relaxed"
        >
          {value || <span className="text-[#52525B]">{placeholder ?? "Click to add..."}</span>}
        </button>
      )}
    </InlineFieldShell>
  );
}

// --- Inline editable business name (header) ---

interface InlineBusinessNameProps {
  value: string;
  savingField: SavingField;
  onSave: (fieldName: string, value: string | null) => void;
}

function InlineBusinessName({ value, savingField, onSave }: InlineBusinessNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const newVal = draft.trim();
    if (!newVal) {
      setDraft(value);
      return;
    }
    if (newVal !== value) {
      onSave("business_name", newVal);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="text-xl font-bold text-[#FAFAFA] tracking-tight bg-transparent border-b-2 border-[#0EA5E9] outline-none w-full py-0.5"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xl font-bold text-[#FAFAFA] tracking-tight hover:bg-[#27272A]/50 rounded px-1 -mx-1 py-0.5 transition-colors duration-100 cursor-text truncate text-left"
        >
          {value}
        </button>
      )}
      {savingField === "business_name" && (
        <Loader2 className="w-4 h-4 text-[#0EA5E9] animate-spin shrink-0" />
      )}
    </div>
  );
}

// ============================================================
// Outer shell
// ============================================================

export function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onLeadUpdate,
  onLeadDelete,
}: LeadDetailModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && lead && (
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

            <Dialog.Content
              asChild
              onPointerDownOutside={() => onOpenChange(false)}
              onEscapeKeyDown={() => onOpenChange(false)}
            >
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => onOpenChange(false)}
              >
                <motion.div
                  className="relative w-full max-w-3xl h-[80vh] flex flex-col rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl overflow-hidden"
                  initial={{ scale: 0.95, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <LeadDetailModalBody
                    lead={lead}
                    onOpenChange={onOpenChange}
                    onLeadUpdate={onLeadUpdate}
                    onLeadDelete={onLeadDelete}
                  />
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ============================================================
// Inner body
// ============================================================

interface LeadDetailModalBodyProps {
  lead: Lead;
  onOpenChange: (open: boolean) => void;
  onLeadUpdate: (updatedLead: Lead) => void;
  onLeadDelete: (leadId: string) => void;
}

function LeadDetailModalBody({
  lead,
  onOpenChange,
  onLeadUpdate,
  onLeadDelete,
}: LeadDetailModalBodyProps) {
  const [activeTab, setActiveTab] = useState<"details" | "outreach">("details");
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // outreach state
  const [outreachEntries, setOutreachEntries] = useState<OutreachLog[]>([]);
  const [loadingOutreach, setLoadingOutreach] = useState(false);
  const [newOutreachType, setNewOutreachType] = useState<OutreachType>("email");
  const [newOutreachContent, setNewOutreachContent] = useState("");
  const [submittingOutreach, setSubmittingOutreach] = useState(false);

  // reset state when lead changes
  useEffect(() => {
    setActiveTab("details");
    setConfirmDelete(false);
    setNewOutreachContent("");
    setNewOutreachType("email");
    setSavingField(null);
  }, [lead.id]);

  // fetch outreach entries when outreach tab is selected
  const fetchOutreach = useCallback(async () => {
    setLoadingOutreach(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/outreach`);
      if (!res.ok) throw new Error("Failed to fetch outreach log");
      const data: OutreachLog[] = await res.json();
      setOutreachEntries(data);
    } catch {
      toast.error("Could not load outreach log");
    } finally {
      setLoadingOutreach(false);
    }
  }, [lead.id]);

  useEffect(() => {
    if (activeTab === "outreach") {
      fetchOutreach();
    }
  }, [activeTab, fetchOutreach]);

  // ---- auto-save a single field ----

  const saveField = useCallback(
    async (fieldName: string, value: unknown) => {
      setSavingField(fieldName);

      // optimistic update
      const updatedLead = { ...lead, [fieldName]: value };
      onLeadUpdate(updatedLead as Lead);

      try {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [fieldName]: value }),
        });
        if (!res.ok) throw new Error();
        const saved: Lead = await res.json();
        onLeadUpdate(saved);
      } catch {
        // revert
        onLeadUpdate(lead);
        toast.error("Failed to save");
      } finally {
        setSavingField(null);
      }
    },
    [lead, onLeadUpdate],
  );

  // ---- delete ----

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
      onLeadDelete(lead.id);
      onOpenChange(false);
      toast.success("Lead deleted");
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  }

  // ---- outreach handlers ----

  async function submitOutreach() {
    if (!newOutreachContent.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    setSubmittingOutreach(true);
    const contentSnapshot = newOutreachContent;

    const optimisticEntry: OutreachLog = {
      id: `temp-${Date.now()}`,
      user_id: lead.user_id,
      lead_id: lead.id,
      type: newOutreachType,
      content: contentSnapshot,
      sent_at: new Date().toISOString(),
      response_received: false,
      response_at: null,
    };

    setOutreachEntries((prev) => [optimisticEntry, ...prev]);
    setNewOutreachContent("");

    try {
      const res = await fetch(`/api/leads/${lead.id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newOutreachType, content: contentSnapshot }),
      });
      if (!res.ok) throw new Error("Failed to log outreach");
      const created: OutreachLog = await res.json();
      setOutreachEntries((prev) =>
        prev.map((e) => (e.id === optimisticEntry.id ? created : e)),
      );
      toast.success("Outreach entry logged");
    } catch {
      setOutreachEntries((prev) =>
        prev.filter((e) => e.id !== optimisticEntry.id),
      );
      setNewOutreachContent(contentSnapshot);
      toast.error("Failed to log outreach entry");
    } finally {
      setSubmittingOutreach(false);
    }
  }

  // ---- render ----

  return (
    <>
      {/* ---- Sticky header ---- */}
      <div className="shrink-0 bg-[#18181B] border-b border-[#27272A] px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5 min-w-0 flex-1">
            {/* Editable business name */}
            <Dialog.Title asChild>
              <div>
                <InlineBusinessName
                  value={lead.business_name}
                  savingField={savingField}
                  onSave={saveField}
                />
              </div>
            </Dialog.Title>

            {/* Status + Niche badges (clickable to change) */}
            <div className="flex items-center gap-2 flex-wrap">
              <InlineSelect
                label=""
                fieldName="status"
                value={lead.status}
                options={STATUS_OPTIONS}
                savingField={savingField}
                onSave={saveField}
                colorMap={STATUS_COLOR_MAP}
              />
              <InlineSelect
                label=""
                fieldName="niche"
                value={lead.niche}
                options={NICHE_OPTIONS}
                savingField={savingField}
                onSave={saveField}
              />
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              className="rounded-lg p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors duration-150 shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex gap-1 mt-4">
          {(["details", "outreach"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                activeTab === tab
                  ? "bg-[#27272A] text-[#FAFAFA]"
                  : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#1E1E22]"
              }`}
            >
              {tab === "outreach" ? "Outreach Log" : "Details"}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Scrollable tab content ---- */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-5">
          {activeTab === "details" && (
            <DetailsTab
              lead={lead}
              savingField={savingField}
              saveField={saveField}
              deleting={deleting}
              confirmDelete={confirmDelete}
              onDeleteClick={() => setConfirmDelete(true)}
              onDeleteCancel={() => setConfirmDelete(false)}
              onDeleteConfirm={handleDelete}
            />
          )}

          {activeTab === "outreach" && (
            <OutreachTab
              entries={outreachEntries}
              loading={loadingOutreach}
              newType={newOutreachType}
              newContent={newOutreachContent}
              submitting={submittingOutreach}
              onTypeChange={setNewOutreachType}
              onContentChange={setNewOutreachContent}
              onSubmit={submitOutreach}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// Details Tab
// ============================================================

interface DetailsTabProps {
  lead: Lead;
  savingField: SavingField;
  saveField: (fieldName: string, value: unknown) => void;
  deleting: boolean;
  confirmDelete: boolean;
  onDeleteClick: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}

function DetailsTab({
  lead,
  savingField,
  saveField,
  deleting,
  confirmDelete,
  onDeleteClick,
  onDeleteCancel,
  onDeleteConfirm,
}: DetailsTabProps) {
  return (
    <div className="space-y-8">
      {/* ---- Main layout: left 2/3, right 1/3 ---- */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column */}
        <div className="flex-1 space-y-7 min-w-0">
          {/* Contact info */}
          <div>
            <h3 className="text-xs font-semibold text-[#52525B] uppercase tracking-widest mb-3">
              Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InlineText
                label="Contact Name"
                fieldName="contact_name"
                value={lead.contact_name}
                savingField={savingField}
                onSave={saveField}
                placeholder="Full name"
              />
              <InlineLinkField
                label="Email"
                fieldName="email"
                value={lead.email}
                savingField={savingField}
                onSave={saveField}
                type="email"
              />
              <InlineLinkField
                label="Phone"
                fieldName="phone"
                value={lead.phone}
                savingField={savingField}
                onSave={saveField}
                type="phone"
                copyable
                copyLabel="Phone"
              />
              <InlineLinkField
                label="Instagram"
                fieldName="instagram"
                value={lead.instagram}
                savingField={savingField}
                onSave={saveField}
                type="instagram"
              />
              <InlineLinkField
                label="Website"
                fieldName="website_url"
                value={lead.website_url}
                savingField={savingField}
                onSave={saveField}
                type="url"
                className="sm:col-span-2"
              />
            </div>
          </div>

          {/* Business details */}
          <div>
            <h3 className="text-xs font-semibold text-[#52525B] uppercase tracking-widest mb-3">
              Business
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InlineText
                label="Location"
                fieldName="location"
                value={lead.location}
                savingField={savingField}
                onSave={saveField}
                placeholder="City or region"
              />
              <InlineSelect
                label="Channel"
                fieldName="channel"
                value={lead.channel}
                options={CHANNEL_OPTIONS}
                savingField={savingField}
                onSave={saveField}
              />
              <InlineSelect
                label="Market"
                fieldName="market"
                value={lead.market}
                options={MARKET_OPTIONS}
                savingField={savingField}
                onSave={saveField}
              />
              <InlineText
                label="Source"
                fieldName="source"
                value={lead.source}
                savingField={savingField}
                onSave={saveField}
                placeholder="How discovered"
              />
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-xs font-semibold text-[#52525B] uppercase tracking-widest mb-3">
              Timeline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
              <InlineDate
                label="First Contact"
                fieldName="first_contact"
                value={lead.first_contact}
                savingField={savingField}
                onSave={saveField}
              />
              <InlineDate
                label="Last Contacted"
                fieldName="last_contacted_at"
                value={lead.last_contacted_at}
                savingField={savingField}
                onSave={saveField}
              />
              <InlineDate
                label="Next Follow-up"
                fieldName="next_follow_up"
                value={lead.next_follow_up}
                savingField={savingField}
                onSave={saveField}
              />
            </div>
          </div>

          {/* Extra */}
          <div>
            <h3 className="text-xs font-semibold text-[#52525B] uppercase tracking-widest mb-3">
              Offer
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InlineNumber
                label="Page Speed"
                fieldName="page_speed"
                value={lead.page_speed}
                savingField={savingField}
                onSave={saveField}
                placeholder="Score"
              />
              <InlineSelect
                label="Subscription Tier"
                fieldName="subscription_tier"
                value={lead.subscription_tier}
                options={TIER_OPTIONS}
                savingField={savingField}
                onSave={saveField}
              />
              <InlineLinkField
                label="Demo Site"
                fieldName="demo_site_url"
                value={lead.demo_site_url}
                savingField={savingField}
                onSave={saveField}
                type="url"
                className="sm:col-span-2"
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:w-[280px] xl:w-[320px] shrink-0 space-y-5">
          <InlineTextarea
            label="Notes"
            fieldName="notes"
            value={lead.notes}
            savingField={savingField}
            onSave={saveField}
            placeholder="Add notes..."
            minRows={4}
          />
          <InlineTextarea
            label="First Message"
            fieldName="first_message"
            value={lead.first_message}
            savingField={savingField}
            onSave={saveField}
            placeholder="Initial outreach message..."
            minRows={4}
            copyable
            copyLabel="First Message"
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-[#52525B]">
        <span>Created {formatDate(lead.created_at)}</span>
        <span>Updated {formatDate(lead.updated_at)}</span>
      </div>

      {/* Delete zone */}
      <div className="pt-4 border-t border-[#27272A]">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#EF4444] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Are you sure? This cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteConfirm}
              disabled={deleting}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onDeleteClick}
            className="text-sm text-[#71717A] hover:text-[#EF4444] transition-colors duration-150"
          >
            Delete lead
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Outreach Tab
// ============================================================

interface OutreachTabProps {
  entries: OutreachLog[];
  loading: boolean;
  newType: OutreachType;
  newContent: string;
  submitting: boolean;
  onTypeChange: (type: OutreachType) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
}

function OutreachTab({
  entries,
  loading,
  newType,
  newContent,
  submitting,
  onTypeChange,
  onContentChange,
  onSubmit,
}: OutreachTabProps) {
  return (
    <div className="space-y-6">
      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-[#0EA5E9] animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-[#1E1E22] p-3 mb-3">
            <Mail className="w-5 h-5 text-[#71717A]" />
          </div>
          <p className="text-sm text-[#71717A]">No outreach logged yet</p>
          <p className="text-xs text-[#52525B] mt-1">
            Log your first email, call, or demo below
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {entries.map((entry, idx) => {
            const Icon = OUTREACH_ICON_MAP[entry.type];
            const isLast = idx === entries.length - 1;

            return (
              <div key={entry.id} className="flex gap-3">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${OUTREACH_ICON_BG[entry.type]}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-[#27272A] my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#FAFAFA] capitalize">
                      {entry.type === "follow_up" ? "Follow-up" : entry.type}
                    </span>
                    {entry.response_received ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#22C55E]/15 px-2 py-0.5 text-xs font-semibold text-[#22C55E]">
                        <CheckCircle2 className="w-3 h-3" />
                        Replied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#27272A] px-2 py-0.5 text-xs font-semibold text-[#71717A]">
                        <Clock className="w-3 h-3" />
                        No response
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#71717A] mb-1.5">
                    {formatDateTime(entry.sent_at)}
                  </p>
                  {entry.content && (
                    <p className="text-sm text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">
                      {entry.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add entry form */}
      <div className="space-y-3 rounded-lg border border-[#27272A] bg-[#1E1E22] p-4">
        <p className="text-sm font-medium text-[#FAFAFA]">Log new entry</p>

        {/* Type selector */}
        <div className="flex gap-1 flex-wrap">
          {OUTREACH_TYPES.map((ot) => {
            const Icon = ot.icon;
            return (
              <button
                key={ot.value}
                onClick={() => onTypeChange(ot.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  newType === ot.value
                    ? "bg-[#27272A] text-[#FAFAFA]"
                    : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#27272A]/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {ot.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <textarea
          value={newContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="What happened? Email content, call notes, etc."
          rows={3}
          className="flex w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0EA5E9] transition-colors duration-200 resize-none"
        />

        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={submitting || !newContent.trim()}
            size="sm"
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
          >
            {submitting ? "Logging..." : "Log Entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}
