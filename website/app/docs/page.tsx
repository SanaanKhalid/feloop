'use client';
import { useEffect } from 'react';
import { docsHref } from '../../lib/docs-links';
export default function DocsRedirect() {
  useEffect(() => { window.location.replace(docsHref(window.location.hash)); }, []);
  return <main className="page-shell"><h1>Feloop documentation has moved.</h1><p><a href={docsHref()}>Continue to the canonical Fern documentation →</a></p></main>;
}
