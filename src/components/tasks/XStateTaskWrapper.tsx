"use client";

import { type ReactNode } from 'react';
import { type AnyStateMachine } from 'xstate';
import { useActor } from '@xstate/react';

interface XStateTaskWrapperProps {
  /** The XState experiment machine */
  machine: AnyStateMachine;
  /** Render function for each machine state */
  children: (state: {
    stateValue: string | Record<string, string>;
    context: any;
    send: (event: any) => void;
    snapshot: any;
    trialActor: any;
  }) => ReactNode;
  /** Called when machine reaches final state */
  onComplete?: (context: any) => void;
}

export default function XStateTaskWrapper({
  machine,
  children,
  onComplete,
}: XStateTaskWrapperProps) {
  const [snapshot, send, actorRef] = useActor(machine);

  // Check for completion
  if (snapshot.status === 'done' && onComplete) {
    // Use a ref to avoid calling multiple times
    onComplete(snapshot.context);
  }

  const trialActor = snapshot.children.currentTrial ?? null;

  return (
    <>
      {children({
        stateValue: snapshot.value,
        context: snapshot.context,
        send,
        snapshot,
        trialActor,
      })}
    </>
  );
}
