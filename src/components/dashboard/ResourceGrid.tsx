"use client";

import { useMemo, useState } from "react";
import { AddResourceDialog } from "@/components/dashboard/AddResourceDialog";
import { ResourceCard, type ResourceListItem } from "@/components/dashboard/ResourceCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS, type ResourceCategory } from "@/lib/resources";

export type ResourceMetrics = { total: number; contributors: number; saves: number };

const FILTERS: ("all" | ResourceCategory)[] = ["all", ...RESOURCE_CATEGORIES];

function filterLabel(filter: "all" | ResourceCategory) {
  return filter === "all" ? "All" : RESOURCE_CATEGORY_LABELS[filter];
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Card>
  );
}

export function ResourceGrid({ resources, metrics }: { resources: ResourceListItem[]; metrics: ResourceMetrics }) {
  const [filter, setFilter] = useState<"all" | ResourceCategory>("all");

  const visible = useMemo(
    () => (filter === "all" ? resources : resources.filter((r) => r.category === filter)),
    [resources, filter],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Resources" value={metrics.total} />
        <Stat label="Contributors" value={metrics.contributors} />
        <Stat label="Total saves" value={metrics.saves} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {filterLabel(f)}
            </Button>
          ))}
        </div>
        <AddResourceDialog />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {resources.length === 0
            ? "Nothing shared yet. Be the first to bookmark something, or write it up yourself."
            : "Nothing in this category yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
