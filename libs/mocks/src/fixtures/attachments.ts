/**
 * @file Attachment fixtures for hero cases.
 */
import type { Attachment } from '@platform/contracts';

export const ATTACHMENTS_BY_CASE: Record<string, Attachment[]> = {
  'FRD-2026-000142': [
    {
      attachmentId: 'ATT-1',
      fileName: 'id-scan-at-store.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 482113,
      uploadedBy: 'Priya Natarajan',
      uploadedAt: '2026-09-21T15:00:00Z',
      category: 'IDENTITY',
    },
    {
      attachmentId: 'ATT-2',
      fileName: 'store-cctv-request.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 31744,
      uploadedBy: 'Priya Natarajan',
      uploadedAt: '2026-09-21T15:03:00Z',
      category: 'EVIDENCE',
    },
  ],
};
