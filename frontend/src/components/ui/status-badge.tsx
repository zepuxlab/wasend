import { cn } from "@/lib/utils";

type Status = "draft" | "sending" | "completed" | "failed" | "approved" | "pending" | "rejected" | "open" | "closed";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  sending: {
    label: "Sending",
    className: "bg-primary/10 text-primary",
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive",
  },
  approved: {
    label: "Approved",
    className: "bg-success/10 text-success",
  },
  pending: {
    label: "Pending",
    className: "bg-warning/10 text-warning",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
  },
  open: {
    label: "Open",
    className: "bg-primary/10 text-primary",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
