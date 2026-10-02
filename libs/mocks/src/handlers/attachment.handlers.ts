/**
 * @file Mock API: list, upload (writes an audit event) and download attachments of a case.
 */
import { http, HttpResponse } from 'msw';
import type { Attachment } from '@platform/contracts';
import { api } from '../lib/api-path';
import { forbidden, has, notFound, simulatedFailure } from '../lib/http-errors';
import { appendAudit, attachmentsFor, nextId } from '../lib/mock-db';
import { mockDelay, shouldFailApi } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

export const attachmentHandlers = [
  http.get(api('/cases/:caseId/attachments'), async ({ params, request }) => {
    await mockDelay();
    if (shouldFailApi(new URL(request.url).pathname)) return simulatedFailure();
    if (!has(personaFromRequest(request), 'case:attachments:view')) return forbidden('case:attachments:view');
    return HttpResponse.json<Attachment[]>(attachmentsFor(params['caseId'] as string));
  }),

  http.post(api('/cases/:caseId/attachments'), async ({ params, request }) => {
    await mockDelay();
    const persona = personaFromRequest(request);
    if (!has(persona, 'case:attachments:upload')) return forbidden('case:attachments:upload');
    const caseId = params['caseId'] as string;
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return HttpResponse.json({ message: 'file is required' }, { status: 400 });
    const att: Attachment = {
      attachmentId: nextId('ATT'),
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploadedBy: persona.displayName,
      uploadedAt: new Date().toISOString(),
      category: (form.get('category') as Attachment['category']) ?? 'OTHER',
    };
    attachmentsFor(caseId).push(att);
    appendAudit(caseId, 'ATTACHMENT_ADDED', att.fileName, persona.displayName, { component: 'Attachments' }); // keeps the audit tab truthful
    return HttpResponse.json(att, { status: 201 });
  }),

  http.get(api('/cases/:caseId/attachments/:attachmentId/content'), async ({ params, request }) => {
    if (!has(personaFromRequest(request), 'case:attachments:view')) return forbidden('case:attachments:view');
    const att = attachmentsFor(params['caseId'] as string).find((a) => a.attachmentId === params['attachmentId']);
    if (!att) return notFound('Attachment');
    return new HttpResponse(`Mock content of ${att.fileName}`, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="${att.fileName}.txt"` },
    });
  }),
];
