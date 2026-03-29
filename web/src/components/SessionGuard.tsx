'use client';

import { useEffect } from 'react';

export default function SessionGuard() {
  useEffect(() => {
    // Check if the page was reloaded
    const entries = window.performance.getEntriesByType('navigation');
    const isReload = entries.length > 0 && (entries[0] as any).type === 'reload';

    if (isReload) {
      console.log('[SESSION] Reload detected. Clearing ephemeral session data...');
      const sessionKeys = [
        'zkkyc_phi', 
        'zkkyc_phone', 
        'zkkyc_address',
        'zkkyc_session', 
        'zkkyc_admin_token', 
        'zkkyc_admin_user', 
        'zkkyc_sp_token', 
        'zkkyc_sp_id', 
        'zkkyc_sp_company'
      ];
      sessionKeys.forEach(k => sessionStorage.removeItem(k));
      
      // Optionally redirect to home or login if on a protected page
      if (window.location.pathname.startsWith('/dashboard') || 
          window.location.pathname.startsWith('/admin') || 
          window.location.pathname.startsWith('/sp')) {
        window.location.href = '/login';
      }
    }
  }, []);

  return null;
}
