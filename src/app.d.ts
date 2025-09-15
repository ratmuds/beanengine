// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		// Global logging helpers exposed by runtimeStore
		runtimeLog?: {
			info: (message: string, source?: string, data?: any) => void;
			warn: (message: string, source?: string, data?: any) => void;
			error: (message: string, source?: string, data?: any) => void;
		};
		// Global input helpers to work with Pointer Lock API
		runtimeInput?: {
			captureMouse: () => Promise<boolean>;
			uncaptureMouse: () => void;
			isMouseCaptured: () => boolean;
		};
	}
}

export {};
