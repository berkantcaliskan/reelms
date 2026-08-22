import React, { useState } from 'react';
import AuditLogView from './AuditLogView';
import BanListView from './BanListView';

/**
 * AuditLogTab component renders two sub‑tabs: the audit log and the ban list.
 * It expects a `reelmId` prop to fetch data for the current Reelm.
 */
export default function AuditLogTab({ reelmId }) {
  const [activeSubTab, setActiveSubTab] = useState('log'); // 'log' | 'ban'

  return (
    <div className="audit-log-tab">
      <div className="audit-subtab-nav" style={{ marginBottom: '12px' }}>
        <button
          type="button"
          className={`subtab-btn${activeSubTab === 'log' ? ' subtab-btn--active' : ''}`}
          onClick={() => setActiveSubTab('log')}
        >
          Audit Log
        </button>
        <button
          type="button"
          className={`subtab-btn${activeSubTab === 'ban' ? ' subtab-btn--active' : ''}`}
          onClick={() => setActiveSubTab('ban')}
        >
          Ban List
        </button>
      </div>
      {activeSubTab === 'log' && <AuditLogView reelmId={reelmId} />}
      {activeSubTab === 'ban' && <BanListView reelmId={reelmId} />}
    </div>
  );
}
