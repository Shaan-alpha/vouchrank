import { useState } from 'react';
import { Smartphone, Send, Clock, Plus } from 'lucide-react';
import * as api from '../lib/api';

// Keyed by location id in App and only rendered once campaignData has loaded,
// so the useState initializers below always see the right tenant's data —
// no prop->state sync effect needed.
export default function Campaigns({ company, campaignData }) {
  const [activeTrigger, setActiveTrigger] = useState('manual');
  const [smsText, setSmsText] = useState(campaignData?.sms ?? '');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sendingState, setSendingState] = useState('idle'); // idle, sending, sent
  const [sentHistory, setSentHistory] = useState(campaignData?.history ?? []);

  // Parse placeholder text for preview
  const getParsedSMS = () => {
    let parsed = smsText;
    const nameVal = recipientName || 'David';
    const bizVal = company.name;
    const linkVal = `vouchrank.com/rate/${company.id}`;
    
    parsed = parsed.replace(/\[First Name\]/g, nameVal);
    parsed = parsed.replace(/\[Business Name\]/g, bizVal);
    parsed = parsed.replace(/https:\/\/\S+/g, linkVal);
    return parsed;
  };

  const handleInsertPlaceholder = (token) => {
    setSmsText(prev => prev + ` ${token}`);
  };

  const handleSendTestRequest = async (e) => {
    e.preventDefault();
    if (!recipientName || !recipientPhone) return;

    setSendingState('sending');
    try {
      await api.sendReviewRequest({
        locationId: company.id,
        channel: 'sms',
        recipient: recipientPhone,
        firstName: recipientName,
      });
      setSendingState('sent');
      setSentHistory((prev) => [
        { id: `c-gen-${Date.now()}`, type: 'SMS', recipient: recipientName, status: 'Delivered', clicked: false, date: 'Just now' },
        ...prev,
      ]);
    } catch {
      setSendingState('idle');
      return;
    }

    // Reset form shortly after success
    setTimeout(() => {
      setRecipientName('');
      setRecipientPhone('');
      setSendingState('idle');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* CRM Trigger Automation Cards */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock style={{ color: 'var(--agency-primary)', width: '18px' }} />
          CRM Review Request Triggers
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
          Set up when reviews are requested. Connect your Stripe, Zapier, or clinic scheduling system to automate review drip campaigns.
        </p>

        <div className="trigger-card-group">
          <div 
            className={`trigger-card ${activeTrigger === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTrigger('manual')}
            id="trigger-btn-manual"
          >
            <div className="trigger-icon">
              <Smartphone style={{ width: '20px' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', color: '#fff' }}>Manual Request</h4>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Send one-off SMS/Emails</p>
            </div>
          </div>

          <div 
            className={`trigger-card ${activeTrigger === 'stripe' ? 'active' : ''}`}
            onClick={() => setActiveTrigger('stripe')}
            id="trigger-btn-stripe"
          >
            <div className="trigger-icon">
              <Plus style={{ width: '20px' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', color: '#fff' }}>Stripe Trigger</h4>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Stripe Charge Successful</p>
            </div>
          </div>

          <div 
            className={`trigger-card ${activeTrigger === 'crm' ? 'active' : ''}`}
            onClick={() => setActiveTrigger('crm')}
            id="trigger-btn-crm"
          >
            <div className="trigger-icon">
              <Clock style={{ width: '20px' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', color: '#fff' }}>EHR / Custom CRM</h4>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>1 hour after checkout</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Campaign Editor Work area */}
      <div className="campaign-editor-layout">
        
        {/* Left Column: Template Editor & Test Sender */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SMS Composer */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone style={{ width: '18px', color: 'var(--agency-secondary)' }} />
              SMS Template Editor
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
              Customize the SMS sent to clients. Dynamic placeholders will populate customer details dynamically.
            </p>

            <textarea
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              className="input-control"
              style={{ width: '100%', minHeight: '90px', fontFamily: 'sans-serif', fontSize: '13px', marginBottom: '12px' }}
              id="textarea-campaign-sms"
            />

            {/* Placeholders Toolbar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <button type="button" className="btn-sm-action" onClick={() => handleInsertPlaceholder('[First Name]')} id="btn-insert-firstname">
                + [First Name]
              </button>
              <button type="button" className="btn-sm-action" onClick={() => handleInsertPlaceholder('[Business Name]')} id="btn-insert-bizname">
                + [Business Name]
              </button>
              <button type="button" className="btn-sm-action" onClick={() => handleInsertPlaceholder('https://vouchrank.com/rate/')} id="btn-insert-link">
                + [Review Link]
              </button>
            </div>

            {/* Test Sender Form */}
            <form onSubmit={handleSendTestRequest} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '12px' }}>Send Test Review Invite</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px' }}>Customer Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="input-control"
                    placeholder="E.g., Sarah Jenkins"
                    required
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    id="input-campaign-recipient-name"
                  />
                </div>

                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px' }}>Phone Number</label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="input-control"
                    placeholder="+1 (555) 123-4567"
                    required
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    id="input-campaign-recipient-phone"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary-action" 
                style={{ width: '100%', fontSize: '13px', padding: '10px 20px' }}
                disabled={sendingState !== 'idle'}
                id="btn-send-test-sms"
              >
                <Send style={{ width: '16px' }} />
                {sendingState === 'sending' && 'Sending Invite SMS...'}
                {sendingState === 'sent' && 'Message Delivered successfully!'}
                {sendingState === 'idle' && 'Send Invite SMS'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Smartphone Simulator */}
        <div>
          <div className="glass-card" style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#07080c' }}>
            <div style={{ width: '240px', background: '#0e1017', borderRadius: '28px', border: '6px solid #1f2231', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 15px 35px rgba(0,0,0,0.5)' }}>
              
              {/* Phone Header notch */}
              <div style={{ height: '14px', background: '#1f2231', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '30px', height: '2px', background: '#0c0d13', borderRadius: '10px', marginTop: '3px' }}></div>
              </div>

              {/* Message Screen */}
              <div className="phone-sms-body">
                <div className="phone-sms-bubble">
                  {getParsedSMS()}
                </div>
              </div>

              {/* Message Input bar */}
              <div className="phone-sms-input-simulator">
                <div className="phone-sms-input-pill">iMessage</div>
                <div className="phone-sms-send-icon">
                  <Send style={{ width: '10px', height: '10px' }} />
                </div>
              </div>
            </div>
            
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px', fontWeight: '500', textTransform: 'uppercase' }}>
              Live Message Preview
            </span>
          </div>
        </div>
      </div>

      {/* Campaign Logs History */}
      <div className="glass-card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Sent Invites History Log</h3>
        
        <table className="battleboard-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Invite Type</th>
              <th>Recipient Name</th>
              <th>Status</th>
              <th>Interaction</th>
              <th>Date Sent</th>
            </tr>
          </thead>
          <tbody>
            {sentHistory.map((log) => (
              <tr key={log.id}>
                <td style={{ fontWeight: 'bold' }}>{log.type}</td>
                <td>{log.recipient}</td>
                <td>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    {log.status}
                  </span>
                </td>
                <td>
                  {log.clicked ? (
                    <span style={{ fontSize: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--agency-secondary)', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                      ✓ Clicked Link
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sent / No Click</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{log.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
