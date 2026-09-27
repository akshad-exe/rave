"use client";

import { cn } from "@rave/ui/lib/utils";
import type * as React from "react";

interface TabsProps {
  children: React.ReactNode;
  className?: string;
  defaultIndex?: number;
  onChange?: (index: number) => void;
}

function Tabs({ defaultIndex = 0, onChange, className, children }: TabsProps) {
  const [activeIndex, setActiveIndex] = React.useState(defaultIndex);

  React.useEffect(() => {
    setActiveIndex(defaultIndex);
  }, [defaultIndex]);

  const childArray = React.Children.toArray(children);
  const tabList = childArray.find(
    (child) => child.type === TabList
  ) as React.ReactElement;
  const tabPanels = childArray.filter(
    (child) => child.type === TabPanel
  ) as React.ReactElement[];

  if (!tabList) {
    return null;
  }

  const triggers = React.Children.toArray(
    tabList.props.children
  ) as React.ReactElement[];

  return (
    <div className={cn("w-full", className)} data-slot="tabs">
      <div
        className={cn(
          "flex items-center gap-1 rounded-md bg-muted p-1",
          tabList.props.className
        )}
        data-slot="tabs-list"
        role="tablist"
      >
        {triggers.map((trigger, index) => (
          <button
            aria-controls={`panel-${index}`}
            aria-selected={index === activeIndex}
            className={cn(
              "relative flex size-full items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 font-medium text-muted-foreground text-sm outline-none transition-all",
              index === activeIndex
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-muted hover:text-foreground",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              "disabled:pointer-events-none disabled:opacity-50",
              trigger.props.className
            )}
            data-slot="tabs-trigger"
            id={`tab-${index}`}
            key={trigger.key ?? index}
            onClick={() => {
              setActiveIndex(index);
              onChange?.(index);
            }}
            role="tab"
            {...trigger.props}
          >
            {trigger.props.children}
          </button>
        ))}
      </div>
      {tabPanels.map((panel, index) => (
        <div
          aria-labelledby={`tab-${index}`}
          className={cn(
            "mt-4 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            panel.props.className
          )}
          data-slot="tabs-content"
          hidden={index !== activeIndex}
          id={`panel-${index}`}
          key={panel.key ?? index}
          role="tabpanel"
          {...panel.props}
        >
          {panel.props.children}
        </div>
      ))}
    </div>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

function TabList({ className, children }: TabListProps) {
  return <div className={className}>{children}</div>;
}

interface TabPanelProps {
  children: React.ReactNode;
  className?: string;
}

function TabPanel({ className, children }: TabPanelProps) {
  return <div className={className}>{children}</div>;
}

export { TabList as TabsList, TabPanel as TabsContent, Tabs };
