import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-dark-default'],
			langs: ['typescript', 'csharp']
		});
	}
	return highlighterPromise;
}

/**
 * Highlight code and return HTML string.
 * Returns null if highlighting isn't ready yet (caller should show plain text fallback).
 */
export async function highlightCode(code: string, language: string): Promise<string> {
	const highlighter = await getHighlighter();
	return highlighter.codeToHtml(code, {
		lang: language,
		theme: 'github-dark-default'
	});
}
