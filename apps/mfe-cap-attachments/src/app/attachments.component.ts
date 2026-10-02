/**
 * @file Attachments tab, exposed as './Attachments': list, upload (emits ATTACHMENT_ADDED) and download.
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsButton, DsEmptyState, DsNotificationService, DsSelect, DsSkeleton } from '@org/design-system';
import { CaseEvent, CaseEventBus, type Attachment, type AttachmentCategory, type CaseType } from '@platform/contracts';
import { HasEntitlementDirective } from '@platform/entitlements';
import { firstValueFrom } from 'rxjs';

/**
 * Exposed as './Attachments'. List, upload, download. Emits CaseEvent.ATTACHMENT_ADDED after an upload
 * so unrelated MFEs (the audit tab) can refresh. Upload is hidden without case:attachments:upload,
 * and the API enforces the same entitlement.
 */
@Component({
  selector: 'attachments-attachments',
  imports: [DatePipe, DsButton, DsSelect, DsSkeleton, DsEmptyState, HasEntitlementDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attachments.component.html',
  styleUrl: './attachments.component.css',
})
export class AttachmentsComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();

  private readonly http = inject(HttpClient);
  private readonly events = inject(CaseEventBus);
  private readonly toasts = inject(DsNotificationService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('file');

  protected readonly categories = (
    ['EVIDENCE', 'IDENTITY', 'CORRESPONDENCE', 'OTHER'] satisfies AttachmentCategory[]
  ).map((c) => ({
    value: c,
    label: c.charAt(0) + c.slice(1).toLowerCase(),
  }));
  protected readonly category = signal<string>('EVIDENCE');
  protected readonly uploading = signal(false);

  protected readonly attachments = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) => this.http.get<Attachment[]>(this.url(params)),
  });

  protected async upload(): Promise<void> {
    const file = this.fileInput()?.nativeElement.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('category', this.category());
    this.uploading.set(true);
    try {
      const att = await firstValueFrom(this.http.post<Attachment>(this.url(this.caseId()), form));
      this.attachments.reload();
      this.events.emit(CaseEvent.ATTACHMENT_ADDED, { caseId: this.caseId(), attachmentId: att.attachmentId });
      this.toasts.show(`Uploaded ${att.fileName}`, 'success');
      this.fileInput()!.nativeElement.value = '';
    } catch {
      this.toasts.show(`Upload of ${file.name} failed`, 'danger');
    } finally {
      this.uploading.set(false);
    }
  }

  protected async download(att: Attachment): Promise<void> {
    // Fetched through HttpClient so the auth interceptor adds the token; a plain <a href> would not.
    const blob = await firstValueFrom(
      this.http.get(`${this.url(this.caseId())}/${att.attachmentId}/content`, { responseType: 'blob' }),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = att.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected size(bytes: number): string {
    return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private url(caseId: string): string {
    return `/api/cases/${encodeURIComponent(caseId)}/attachments`;
  }
}

export default AttachmentsComponent;
