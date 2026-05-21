import { describe, expect, it } from 'vitest';
import { isPortalCardVisible, PORTAL_MODULES } from './portalModules';

describe('portalModules', () => {
  it('defines seven staff modules', () => {
    expect(PORTAL_MODULES).toHaveLength(7);
  });

  it('shows all cards for admin', () => {
    PORTAL_MODULES.forEach((m) => {
      expect(isPortalCardVisible('admin', m.id)).toBe(true);
    });
  });

  it('limits photographer to photographer card only', () => {
    expect(isPortalCardVisible('photographer', 'card-photographer')).toBe(true);
    expect(isPortalCardVisible('photographer', 'card-admin')).toBe(false);
  });
});
