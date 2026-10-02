/**
 * @file Every handler.
 */
import { identityHandlers } from './identity.handlers';
import { caseHandlers } from './case.handlers';
import { usageHandlers } from './usage.handlers';
import { attachmentHandlers } from './attachment.handlers';
import { auditHandlers } from './audit.handlers';
import { fraudHandlers } from './fraud.handlers';
import { resolutionHandlers } from './resolution.handlers';
import { accountHandlers } from './account.handlers';
import { domainOverviewHandlers } from './domain-overview.handlers';
import { customerHandlers } from './customer.handlers';
import { profileHandlers } from './profile.handlers';
import { reportHandlers } from './report.handlers';

export {
  identityHandlers,
  caseHandlers,
  usageHandlers,
  attachmentHandlers,
  auditHandlers,
  fraudHandlers,
  resolutionHandlers,
  accountHandlers,
  domainOverviewHandlers,
  customerHandlers,
  profileHandlers,
  reportHandlers,
};

/** Every handler. The shell registers all of them; a remote's standalone harness may register a subset. */
export const allHandlers = [
  ...identityHandlers,
  ...caseHandlers,
  ...usageHandlers,
  ...attachmentHandlers,
  ...auditHandlers,
  ...fraudHandlers,
  ...resolutionHandlers,
  ...accountHandlers,
  ...domainOverviewHandlers,
  ...customerHandlers,
  ...profileHandlers,
  ...reportHandlers,
];
