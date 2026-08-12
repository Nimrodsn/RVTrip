'use client';

import { Fragment } from 'react';
import { motion, type Variants } from 'motion/react';

/**
 * Adapted from React Bits "Stepper" (https://reactbits.dev/components/stepper).
 * Upstream is a multi-step form wizard; this keeps only its animated indicator rail so it can
 * show which checklist items are done, without taking over navigation.
 */

export interface ProgressStep {
  label: string;
  complete: boolean;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  onStepClick?: (index: number) => void;
}

export default function ProgressSteps({ steps, onStepClick }: ProgressStepsProps) {
  return (
    <div className="flex w-full items-center">
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          <StepIndicator
            step={index + 1}
            label={step.label}
            isComplete={step.complete}
            onClick={onStepClick ? () => onStepClick(index) : undefined}
          />
          {index < steps.length - 1 && <StepConnector isComplete={step.complete && steps[index + 1].complete} />}
        </Fragment>
      ))}
    </div>
  );
}

interface StepIndicatorProps {
  step: number;
  label: string;
  isComplete: boolean;
  onClick?: () => void;
}

function StepIndicator({ step, label, isComplete, onClick }: StepIndicatorProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={label}
      aria-label={label}
      data-motion=""
      animate={isComplete ? 'complete' : 'incomplete'}
      initial={false}
      className={`shrink-0 rounded-full outline-none ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <motion.span
        variants={{
          incomplete: { backgroundColor: '#e5e7eb', color: '#6b7280' },
          complete: { backgroundColor: '#16a34a', color: '#ffffff' },
        }}
        transition={{ duration: 0.3 }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
      >
        {isComplete ? <CheckIcon className="h-4 w-4" /> : step}
      </motion.span>
    </motion.button>
  );
}

const lineVariants: Variants = {
  incomplete: { width: 0 },
  complete: { width: '100%' },
};

function StepConnector({ isComplete }: { isComplete: boolean }) {
  return (
    <div className="relative mx-1 h-1 flex-1 overflow-hidden rounded bg-gray-200">
      <motion.div
        className="absolute inset-y-0 right-0 bg-green-600"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
