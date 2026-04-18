declare const EXT_NAME: string;
declare const chrome: any;
declare const process: { env: { NODE_ENV?: string } };

declare namespace JQueryI18n {
	interface Api {
		locale?: string;
		load: (messages: unknown) => { done: (callback: () => void) => void };
	}
}

interface JQueryStatic {
	i18n: {
		(options?: unknown): JQueryI18n.Api;
		debug?: boolean;
	};
}

interface JQuery {
	i18n: () => JQuery;
}
