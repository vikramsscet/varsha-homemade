import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatStatus, getInitials, orNotProvided } from './profileFormat';

describe('profileFormat', () => {
  it('formats valid dates', () => {
    expect(formatDate('2026-10-30T16:07:58.150Z')).toMatch(/^\d{1,2} Oct 2026$/);
    expect(formatDateTime('2026-10-30T16:12:28.962Z')).toMatch(/^\d{1,2} Oct 2026, \d{1,2}:\d{2} (AM|PM)$/);
  });
  it('handles missing or invalid dates', () => {
    for (const v of [null, undefined, '', 'garbage']) {
      expect(formatDate(v)).toBe('Not provided');
      expect(formatDateTime(v)).toBe('Not provided');
    }
  });
  it('handles missing strings, status and initials', () => {
    expect(orNotProvided(null)).toBe('Not provided');
    expect(orNotProvided('Vikram')).toBe('Vikram');
    expect(formatStatus('ACTIVE')).toBe('Active');
    expect(formatStatus(undefined)).toBe('Not provided');
    expect(getInitials({ displayName: 'Vikram Rao' })).toBe('VR');
    expect(getInitials({ email: 'vikram@x.com' })).toBe('V');
  });
});
