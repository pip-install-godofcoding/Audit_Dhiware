import * as React from "react"
import FrameworkCard from "./FrameworkCard"

export interface Framework {
  id: string;
  name: string;
  shortName: string;
  controls: number;
  description: string;
}

interface Step2FrameworksProps {
  frameworks: Framework[];
  selectedFrameworkIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function Step2Frameworks({ frameworks, selectedFrameworkIds, onSelectionChange }: Step2FrameworksProps) {
  
  const handleSelect = (id: string) => {
    if (selectedFrameworkIds.includes(id)) {
      onSelectionChange(selectedFrameworkIds.filter(fId => fId !== id));
    } else {
      onSelectionChange([...selectedFrameworkIds, id]);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Select Frameworks</h2>
        <p className="text-sm text-muted-foreground">
          Choose which compliance frameworks to evaluate the documents against.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {frameworks.map((framework) => (
          <FrameworkCard
            key={framework.id}
            id={framework.id}
            name={framework.name}
            shortName={framework.shortName}
            controlCount={framework.controls}
            description={framework.description}
            selected={selectedFrameworkIds.includes(framework.id)}
            onToggle={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}
