import { relevantSubjectIds, type CustomerSummary } from './customer';

const subscriber: CustomerSummary = {
  customerId: 'ACC-1',
  kind: 'SUBSCRIBER',
  displayName: 'S',
  status: 'ACTIVE',
  relatedSubjectIds: ['DLR-9'],
  openCasesByDomain: {},
};
const partner: CustomerSummary = { ...subscriber, customerId: 'DLR-9', kind: 'PARTNER', relatedSubjectIds: ['ACC-1'] };

describe('relevantSubjectIds', () => {
  it('uses the subscriber itself for subscriber domains and its related dealers for partner domains', () => {
    expect(relevantSubjectIds('FRAUD', subscriber)).toEqual(['ACC-1']);
    expect(relevantSubjectIds('PARTNER_FIELD_AUDIT', subscriber)).toEqual(['DLR-9']);
  });
  it('mirrors that for partners', () => {
    expect(relevantSubjectIds('PARTNER_ONGOING', partner)).toEqual(['DLR-9']);
    expect(relevantSubjectIds('FRAUD', partner)).toEqual(['ACC-1']);
  });
});
