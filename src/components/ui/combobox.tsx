"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, CirclePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmptyState,
  CommandGroupSection,
  CommandInputField,
  CommandListBox,
  CommandOptionItem,
  CommandSeparator,
} from "@/components/ui/command";

export type ComboboxOption = {
  value: string;
  label: string;
  /** URL for an avatar image shown in the trigger and dropdown */
  avatarUrl?: string;
  /** Fallback initials when no avatarUrl provided */
  initials?: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** Label rendered above the trigger */
  label?: string;
  /** Helper text rendered below the trigger */
  description?: string;
  /** Label for the "create new" action appended to the list */
  createLabel?: string;
  /** Called when the create action is selected */
  onCreateNew?: () => void;
  /** Portal container for the dropdown — pass preview div ref to inherit scoped CSS vars */
  portalContainer?: HTMLElement | null;
  className?: string;
};

function ComboboxAvatar({
  avatarUrl,
  initials,
  label,
}: {
  avatarUrl?: string;
  initials?: string;
  label: string;
}) {
  return (
    <span className="relative inline-flex size-5 shrink-0 overflow-hidden rounded-full bg-muted">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={label}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-[9px] font-medium text-muted-foreground">
          {initials ?? label.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function Combobox({
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  value,
  onChange,
  label,
  description,
  createLabel,
  onCreateNew,
  portalContainer,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? "");

  const current = internalValue;
  const selected = options.find((o) => o.value === current);

  const handleSelect = (val: string) => {
    const next = val === current ? "" : val;
    setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  };

  const showAvatars = options.some((o) => o.avatarUrl || o.initials);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium leading-none text-foreground">
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            className="w-full justify-between gap-2"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {selected && showAvatars && (
                <ComboboxAvatar
                  avatarUrl={selected.avatarUrl}
                  initials={selected.initials}
                  label={selected.label}
                />
              )}
              <span className={cn("truncate", !selected && "text-muted-foreground")}>
                {selected ? selected.label : placeholder}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          container={portalContainer}
        >
          <Command>
            <CommandInputField placeholder={searchPlaceholder} />
            <CommandListBox>
              <CommandEmptyState>{emptyText}</CommandEmptyState>
              <CommandGroupSection>
                {options.map((option) => (
                  <CommandOptionItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    {showAvatars && (
                      <ComboboxAvatar
                        avatarUrl={option.avatarUrl}
                        initials={option.initials}
                        label={option.label}
                      />
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        current === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandOptionItem>
                ))}
              </CommandGroupSection>

              {(createLabel || onCreateNew) && (
                <>
                  <CommandSeparator />
                  <CommandGroupSection>
                    <CommandOptionItem
                      value="__create__"
                      onSelect={() => {
                        onCreateNew?.();
                        setOpen(false);
                      }}
                    >
                      <CirclePlus className="size-4" />
                      <span className="flex-1">{createLabel ?? "Create new"}</span>
                    </CommandOptionItem>
                  </CommandGroupSection>
                </>
              )}
            </CommandListBox>
          </Command>
        </PopoverContent>
      </Popover>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
