export const DOCS = 'https://feloop.docs.buildwithfern.com';
export const legacyDocs: Record<string, string> = {
  overview: '/get-started/overview', installation: '/get-started/quickstart', architecture: '/get-started/architecture',
  analysis: '/core-concepts/pattern-analysis', candidates: '/core-concepts/improvement-candidates',
  'execution-model': '/core-concepts/executions-and-episodes', signals: '/core-concepts/signals-and-outcomes',
  'self-improvement': '/closing-the-loop/governed-self-improvement', evaluation: '/closing-the-loop/evaluation-and-deployment',
  deployment: '/closing-the-loop/evaluation-and-deployment', 'fine-tuning': '/closing-the-loop/fine-tuning', 'agent-systems': '/closing-the-loop/agent-systems',
  storage: '/operate/storage-adapters', security: '/operate/security-and-privacy', production: '/operate/production-operation',
  api: '/reference/type-script-api', pitfalls: '/reference/common-pitfalls-and-faq', faq: '/reference/common-pitfalls-and-faq',
};
export function docsHref(fragment = ''): string {
  const key = fragment.replace(/^#/, '');
  return DOCS + (Object.hasOwn(legacyDocs, key) ? legacyDocs[key] : legacyDocs.overview);
}
