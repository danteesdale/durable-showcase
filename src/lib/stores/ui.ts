import { writable } from 'svelte/store';
import type { StrategyType } from '../simulation/types';

// ============================================================
// UI State Stores
// ============================================================

/** Whether the internals panel is open */
export const internalsPanelOpen = writable<boolean>(false);

/** Which rocket's internals are being viewed */
export const selectedRocket = writable<StrategyType>('temporal');

/** Whether the code comparison panel is open */
export const codePanelOpen = writable<boolean>(false);

/** Which strategy to show in the code panel (set externally when opening via rocket menu) */
export const codePanelStrategy = writable<StrategyType | null>(null);

/** Whether the guided tour is active */
export const tourActive = writable<boolean>(false);

/** Current tour step (0-indexed) */
export const tourStep = writable<number>(0);

/** Whether the control panel is collapsed */
export const controlPanelCollapsed = writable<boolean>(false);

// ============================================================
// UI Actions
// ============================================================

export function toggleInternalsPanel() {
	internalsPanelOpen.update((v) => !v);
}

export function selectRocket(type: StrategyType) {
	selectedRocket.set(type);
	internalsPanelOpen.set(true);
}

export function selectRocketCode(type: StrategyType) {
	codePanelStrategy.set(type);
	codePanelOpen.set(true);
}

export function toggleCodePanel() {
	codePanelOpen.update((v) => !v);
}

export function startTour() {
	tourActive.set(true);
	tourStep.set(0);
}

export function nextTourStep() {
	tourStep.update((s) => s + 1);
}

export function prevTourStep() {
	tourStep.update((s) => Math.max(0, s - 1));
}

export function endTour() {
	tourActive.set(false);
	tourStep.set(0);
}
